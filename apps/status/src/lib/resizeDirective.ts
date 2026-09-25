import type { Directive } from 'vue'

/**
 * Runs `update` whenever any of `targets` resizes, and again when web fonts
 * finish loading: a late font changes the text without resizing anything.
 */
export function resizeDirective(
  update: (el: HTMLElement) => void,
  targets: (el: HTMLElement) => (Element | null)[],
): Directive<HTMLElement> {
  const observers = new Map<HTMLElement, ResizeObserver>()
  const updateAll = () => observers.forEach((_, el) => update(el))
  return {
    // The first observation fires before paint, so no explicit initial update.
    mounted(el) {
      if (observers.size === 0) document.fonts.addEventListener('loadingdone', updateAll)
      const observer = new ResizeObserver(() => update(el))
      for (const target of targets(el)) if (target) observer.observe(target)
      observers.set(el, observer)
    },
    unmounted(el) {
      observers.get(el)?.disconnect()
      observers.delete(el)
      if (observers.size === 0) document.fonts.removeEventListener('loadingdone', updateAll)
    },
  }
}
