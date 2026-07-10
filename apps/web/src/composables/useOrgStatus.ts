import { onMounted, onUnmounted, ref } from 'vue'
import type { OrgStatus } from '../../../../shared/status'

const POLL_INTERVAL_MS = 60_000

const statuses = ref<ReadonlyMap<string, OrgStatus>>(new Map())

let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

async function fetchStatuses() {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return
    const list = (await res.json()) as OrgStatus[]
    statuses.value = new Map(list.map((status) => [status.orgId, status]))
  } catch {
    // 取得に失敗した場合は前回値を保持する
  }
}

function startPolling() {
  void fetchStatuses()
  timer = setInterval(fetchStatuses, POLL_INTERVAL_MS)
}

function stopPolling() {
  clearInterval(timer)
  timer = undefined
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    if (subscribers > 0 && timer === undefined) startPolling()
  } else {
    stopPolling()
  }
}

function subscribe() {
  if (subscribers++ > 0) return
  if (document.visibilityState === 'visible') startPolling()
  document.addEventListener('visibilitychange', onVisibilityChange)
}

function unsubscribe() {
  if (--subscribers > 0) return
  stopPolling()
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

export function useOrgStatus() {
  onMounted(subscribe)
  onUnmounted(unsubscribe)
  return { statuses }
}
