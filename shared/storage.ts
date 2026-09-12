// Site data can be blocked, and then touching localStorage throws instead of
// returning null. Decide the backend once so no caller has to defend itself:
// preferences stay readable and writable for the session, just not durable.
const memory = new Map<string, string>()

/** Structural, so `shared/` still type-checks against the Worker's DOM-less lib. */
interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const store: KeyValueStore | null = (() => {
  const candidate = (globalThis as { localStorage?: KeyValueStore }).localStorage
  if (!candidate) return null
  try {
    const probe = '__storage_probe__'
    candidate.setItem(probe, probe)
    candidate.removeItem(probe)
    return candidate
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
