import { onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * Freezes the page behind a modal.
 * The reserved scrollbar gutter is kept, so locking does not shift the layout.
 */
export function useScrollLock(active: Ref<boolean>) {
  function release() {
    document.documentElement.classList.remove('scroll-locked')
  }

  watch(active, (locked) => {
    document.documentElement.classList.toggle('scroll-locked', locked)
  })

  onBeforeUnmount(release)
}
