import { resizeDirective } from '@/lib/resizeDirective'

// Shrinks the font until the text fits the width the element is given; sizes
// inside should be in em so everything scales together. The parent is what is
// observed, so its size must not follow the text's, or ResizeObserver loops.
function fit(el: HTMLElement) {
  el.style.fontSize = ''
  if (el.scrollWidth <= el.clientWidth) return
  const base = Number.parseFloat(getComputedStyle(el).fontSize)
  el.style.fontSize = `${Math.floor((base * el.clientWidth * 100) / el.scrollWidth) / 100}px`
}

export const vFitText = resizeDirective(fit, (el) => [el.parentElement ?? el])
