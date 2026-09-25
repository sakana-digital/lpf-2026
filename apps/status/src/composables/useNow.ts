import { onMounted, onUnmounted, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/** The current time shifted by `offset` ms, refreshed every second while mounted. */
export function useNow(offset: MaybeRefOrGetter<number>) {
  const read = () => new Date(Date.now() + toValue(offset))
  const now = ref(read())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      now.value = read()
    }, 1_000)
  })
  onUnmounted(() => clearInterval(timer))

  return now
}
