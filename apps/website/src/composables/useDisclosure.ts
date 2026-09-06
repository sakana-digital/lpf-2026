import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * An outside click or Escape closes it, and Escape returns focus to the trigger.
 * Pass an element covering both the trigger button and the panel as root.
 */
export function useDisclosure(root: Ref<HTMLElement | null>) {
  const isOpen = ref(false)

  function close(returnFocus = false) {
    if (!isOpen.value) return
    isOpen.value = false
    if (returnFocus) root.value?.querySelector('button')?.focus()
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function onClickOutside(event: MouseEvent) {
    if (isOpen.value && !root.value?.contains(event.target as Node)) close()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close(true)
  }

  onMounted(() => {
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('keydown', onKeydown)
  })

  return { isOpen, close, toggle }
}
