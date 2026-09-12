import { ref } from 'vue'

/** The save lifecycle every admin editor shows: in flight, then a saved or failed badge. */
export function useSaveState() {
  const saving = ref(false)
  const saved = ref(false)
  const failed = ref(false)

  /** Re-entry while a save is in flight is dropped; a rejection resolves to `null`. */
  async function save<T>(run: () => Promise<T>): Promise<T | null> {
    if (saving.value) return null
    saving.value = true
    saved.value = false
    failed.value = false
    try {
      const result = await run()
      saved.value = true
      return result
    } catch {
      failed.value = true
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, saved, failed, save }
}
