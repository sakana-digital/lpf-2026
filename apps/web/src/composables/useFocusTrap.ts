import { onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * モーダルが開いている間、Tab をコンテナ内で循環させる。
 * 背後のページには inert を当て、閉じたら起動元にフォーカスを戻す。
 * コンテナは body に Teleport されている前提（#app の外側にある）。
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let restoreTo: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !container.value) return

    const items = [...container.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return

    const inside = container.value.contains(document.activeElement)
    if (event.shiftKey && (document.activeElement === first || !inside)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
      event.preventDefault()
      first.focus()
    }
  }

  function release() {
    document.getElementById('app')?.removeAttribute('inert')
    document.removeEventListener('keydown', onKeydown, true)
  }

  watch(active, (open) => {
    if (open) {
      restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.getElementById('app')?.setAttribute('inert', '')
      document.addEventListener('keydown', onKeydown, true)
    } else {
      release()
      restoreTo?.focus()
      restoreTo = null
    }
  })

  onBeforeUnmount(release)
}
