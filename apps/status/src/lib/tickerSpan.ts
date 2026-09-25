import { resizeDirective } from '@/lib/resizeDirective'

// Exposes how far the element travels, in widths of its track, as `--span` so
// CSS can scale the duration and keep the scroll speed constant.
function measure(el: HTMLElement) {
  const track = el.parentElement?.clientWidth ?? 0
  if (track === 0) return
  el.style.setProperty('--span', String(el.offsetWidth / track))
}

export const vTickerSpan = resizeDirective(measure, (el) => [el, el.parentElement])
