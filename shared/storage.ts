// Site data can be blocked, and then touching localStorage throws instead of
// returning null. Decide the backend once so no caller has to defend itself:
// preferences stay readable and writable for the session, just not durable.
const memory = new Map<string, string>()

const store: Storage | null = (() => {
  try {
    const probe = '__storage_probe__'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    return null
  }
})()

export function readStored(key: string): string | null {
  return store ? store.getItem(key) : (memory.get(key) ?? null)
}

export function writeStored(key: string, value: string) {
  if (!store) {
    memory.set(key, value)
    return
  }
  try {
    store.setItem(key, value)
  } catch {
    // Over quota. Nothing to recover; the in-memory state stays correct.
  }
}
