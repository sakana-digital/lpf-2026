import { onMounted, onUnmounted, ref, type Ref } from 'vue'

// Reactively tracks whether the window has been scrolled past `threshold` px.
export function useScrolledPast(threshold: number): Ref<boolean> {
  const passed = ref(false)
  let ticking = false

  const update = () => {
    passed.value = window.scrollY > threshold
    ticking = false
  }

  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return passed
}
