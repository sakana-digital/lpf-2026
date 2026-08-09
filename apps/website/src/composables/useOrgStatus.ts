import { onMounted, onUnmounted, ref } from 'vue'
import type { OrgStatus } from '../../../../shared/status'

const POLL_INTERVAL_MS = 60_000

const statuses = ref<ReadonlyMap<string, OrgStatus>>(new Map())

let subscribers = 0
let timer: ReturnType<typeof setTimeout> | undefined
let lastRequestAt: number | undefined
let requestInFlight: Promise<void> | undefined

async function requestStatuses() {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return
    const list = (await res.json()) as OrgStatus[]
    statuses.value = new Map(list.map((status) => [status.orgId, status]))
  } catch {
    // 取得に失敗した場合は前回値を保持する
  }
}

function fetchStatuses(): Promise<void> {
  if (requestInFlight !== undefined) return requestInFlight

  const now = Date.now()
  if (lastRequestAt !== undefined && now - lastRequestAt < POLL_INTERVAL_MS) {
    return Promise.resolve()
  }
  lastRequestAt = now
  requestInFlight = requestStatuses().finally(() => {
    requestInFlight = undefined
  })
  return requestInFlight
}

function scheduleNextFetch() {
  if (timer !== undefined || subscribers === 0 || document.visibilityState !== 'visible') return

  const delay =
    lastRequestAt === undefined
      ? 0
      : Math.max(0, Math.min(POLL_INTERVAL_MS, lastRequestAt + POLL_INTERVAL_MS - Date.now()))
  timer = setTimeout(refreshAndSchedule, delay)
}

async function refreshAndSchedule() {
  timer = undefined
  await fetchStatuses()
  scheduleNextFetch()
}

function startPolling() {
  if (timer !== undefined) return
  void refreshAndSchedule()
}

function stopPolling() {
  clearTimeout(timer)
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
