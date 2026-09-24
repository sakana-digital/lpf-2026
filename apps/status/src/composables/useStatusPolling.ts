import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { OrgStatus } from '@shared/status'
import { getStatuses } from '@/lib/api'

/** Each poll is one Worker request for every group, so an open admin tab costs one a minute. */
export const STATUS_POLL_MS = 60_000

/**
 * Polls every group's status while `active` and the tab is visible. A hidden tab sends
 * nothing, and on its return it fetches at once only if a poll is overdue.
 */
export function useStatusPolling(
  token: MaybeRefOrGetter<string>,
  statuses: MaybeRefOrGetter<OrgStatus[]>,
  active: MaybeRefOrGetter<boolean>,
  onStatuses: (statuses: OrgStatus[]) => void,
) {
  const checkedAt = ref(Math.floor(Date.now() / 1000))
  const failed = ref(false)
  const visible = ref(document.visibilityState === 'visible')
  const running = computed(() => toValue(active) && visible.value)

  // The screen already loaded every status, so the first poll waits a full interval.
  let lastRun = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  // A save or reload landing while a poll is in flight is newer than its answer.
  let generation = 0
  watch(
    () => toValue(statuses),
    () => generation++,
    { flush: 'sync' },
  )

  async function poll() {
    lastRun = Date.now()
    const seen = generation
    try {
      const list = await getStatuses(toValue(token))
      failed.value = false
      checkedAt.value = Math.floor(Date.now() / 1000)
      if (seen === generation && !disposed) onStatuses(list)
    } catch {
      failed.value = true
    } finally {
      schedule()
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = undefined
    if (disposed || !running.value) return
    timer = setTimeout(poll, Math.max(0, lastRun + STATUS_POLL_MS - Date.now()))
  }

  function onVisibility() {
    visible.value = document.visibilityState === 'visible'
  }

  document.addEventListener('visibilitychange', onVisibility)
  watch(running, schedule, { immediate: true })

  onScopeDispose(() => {
    disposed = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { checkedAt, failed }
}
