import { ref } from 'vue'
import type { OrgStatus } from '@shared/status'
import { isFestivalDay } from '@/lib/festival'

const statuses = ref<ReadonlyMap<string, OrgStatus>>(new Map())
let request: Promise<void> | undefined

/** Read once, when the first tab that shows it mounts; nothing asks the API again */
export function initOrgStatus(): Promise<void> {
  return (request ??= load())
}

async function load() {
  // Outside the festival days the API always answers with an empty list
  if (!import.meta.env.DEV && !isFestivalDay()) return
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return
    const list = (await res.json()) as OrgStatus[]
    statuses.value = new Map(list.map((status) => [status.orgId, status]))
  } catch {
    // Nothing to show when the fetch fails
  }
}

export function useOrgStatus() {
  void initOrgStatus()
  return { statuses }
}
