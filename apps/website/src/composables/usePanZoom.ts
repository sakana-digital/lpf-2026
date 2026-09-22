import { computed, onScopeDispose, ref } from 'vue'
import type { Ref } from 'vue'

interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Options {
  /** The scale to start from and return to; defaults to 1. `fit` is the scale showing everything */
  initialScale?: (view: Rect, content: Rect, fit: number) => number
}

const MAX_SCALE = 8
const FOCUS_SCALE = 2
const MIN_SCALE = 0.5
const DRAG_PX = 4
const WHEEL_RATE = 0.005
// A fling keeps the last 100 ms of movement and coasts to a stop over about a third of a second
const FLING_SAMPLE_MS = 100
const FLING_MIN_SPEED = 0.05
const FLING_DECAY_MS = 325

/**
 * Pan and pinch-zoom inside an SVG, kept in the viewBox's own units so the
 * result goes straight onto a group's transform. `view` is the part of the
 * viewBox actually on screen and `content` what may be scrolled into it, so
 * a cropped map pans at scale 1 too. One pointer drags and flings, two pinch,
 * and ctrl or ⌘ with the wheel zooms about the cursor; the page keeps the plain
 * wheel, and a finger's pull the map has no room for scrolls the page instead,
 * momentum included.
 */
export function usePanZoom(
  svg: Ref<SVGSVGElement | null>,
  view: Ref<Rect>,
  content: Ref<Rect>,
  options: Options = {},
) {
  const scale = ref(1)
  const tx = ref(0)
  const ty = ref(0)
  /** Whether the user has zoomed or panned since the last reset */
  const touched = ref(false)

  const pointers = new Map<number, Point>()
  let pinchDistance = 0
  let origin: Point | undefined
  let dragged = false
  // The svg is scaled uniformly and only by its size, so one reading per gesture serves every move
  let pixelsPerUnit = 1
  let samples: { t: number; x: number; y: number }[] = []
  let fling: number | undefined

  const transform = computed(() => `translate(${tx.value} ${ty.value}) scale(${scale.value})`)
  const zoomed = computed(() => scale.value > defaultScale() + 0.001)

  /** The scale, up to 1, at which the whole content sits inside the view */
  function fitScale(): number {
    const v = view.value
    const c = content.value
    return Math.min(1, v.w / c.w, v.h / c.h)
  }

  // Zooming out stops at half size, or further where even that leaves the content cropped
  function minScale(): number {
    return Math.min(MIN_SCALE, fitScale())
  }

  function defaultScale(): number {
    return options.initialScale?.(view.value, content.value, fitScale()) ?? 1
  }

  function screenMatrix(): DOMMatrix | null {
    return svg.value?.getScreenCTM() ?? null
  }

  function toUser(client: Point): Point {
    const ctm = screenMatrix()
    if (!ctm) return client
    const point = new DOMPoint(client.x, client.y).matrixTransform(ctm.inverse())
    return { x: point.x, y: point.y }
  }

  // Content wider than the view may not leave it uncovered; content narrower sits centred
  function clampAxis(
    at: number,
    viewPos: number,
    viewSize: number,
    pos: number,
    size: number,
    k = scale.value,
  ) {
    const scaled = size * k
    if (scaled <= viewSize) return viewPos + (viewSize - scaled) / 2 - pos * k
    return Math.min(viewPos - pos * k, Math.max(viewPos + viewSize - scaled - pos * k, at))
  }

  function clamp() {
    const v = view.value
    const c = content.value
    tx.value = clampAxis(tx.value, v.x, v.w, c.x, c.w)
    ty.value = clampAxis(ty.value, v.y, v.h, c.y, c.h)
  }

  function zoomAt(point: Point, factor: number) {
    const next = Math.min(MAX_SCALE, Math.max(minScale(), scale.value * factor))
    const applied = next / scale.value
    tx.value = point.x - (point.x - tx.value) * applied
    ty.value = point.y - (point.y - ty.value) * applied
    scale.value = next
    touched.value = true
    clamp()
  }

  function zoomBy(factor: number) {
    const { x, y, w, h } = view.value
    zoomAt({ x: x + w / 2, y: y + h / 2 }, factor)
  }

  /** Brings a content point to the middle of the view, zooming in to at least `k` */
  function centerOn(point: Point, k = FOCUS_SCALE) {
    stopFling()
    const { x, y, w, h } = view.value
    scale.value = Math.min(MAX_SCALE, Math.max(scale.value, k))
    tx.value = x + w / 2 - point.x * scale.value
    ty.value = y + h / 2 - point.y * scale.value
    touched.value = true
    clamp()
  }

  /** The starting view: the default scale, centred where the box is wider than the content */
  function defaults() {
    const v = view.value
    const c = content.value
    const k = defaultScale()
    return {
      scale: k,
      tx: clampAxis(0, v.x, v.w, c.x, c.w, k),
      ty: clampAxis(0, v.y, v.h, c.y, c.h, k),
    }
  }

  function reset() {
    const start = defaults()
    scale.value = start.scale
    tx.value = start.tx
    ty.value = start.ty
    touched.value = false
  }

  const atDefault = computed(() => {
    const start = defaults()
    return (
      Math.abs(scale.value - start.scale) < 0.001 &&
      Math.abs(tx.value - start.tx) < 0.01 &&
      Math.abs(ty.value - start.ty) < 0.01
    )
  })

  /** Whether the pointer sequence that just ended was a drag, which no click should follow */
  function wasDragged(): boolean {
    const result = dragged
    dragged = false
    return result
  }

  // Capture keeps a gesture alive past the edge. It is taken only once a drag
  // or pinch is under way, because a captured pointer's click lands on the svg
  // instead of the room under it. A pointer already gone cannot be captured.
  function capture(pointerId: number) {
    try {
      svg.value?.setPointerCapture(pointerId)
    } catch {
      // Nothing to hold on to
    }
  }

  // Moves the map by a screen-pixel delta, handing the page the vertical part
  // the map has no room for. Touch-action is off so a pinch is never mistaken
  // for a scroll, which leaves that scroll to do by hand
  function drag(dx: number, dy: number, scrollsPage: boolean) {
    const from = { x: tx.value, y: ty.value }
    tx.value += dx / pixelsPerUnit
    ty.value += dy / pixelsPerUnit
    clamp()
    if (tx.value !== from.x || ty.value !== from.y) touched.value = true
    const spare = dy - (ty.value - from.y) * pixelsPerUnit
    if (scrollsPage && Math.abs(spare) >= 0.5) window.scrollBy(0, -spare)
  }

  function stopFling() {
    if (fling !== undefined) cancelAnimationFrame(fling)
    fling = undefined
  }

  // Coasts on at the speed the pointer left with, slowing exponentially
  function startFling(scrollsPage: boolean) {
    const last = samples[samples.length - 1]
    const first = samples.find((sample) => last && last.t - sample.t <= FLING_SAMPLE_MS)
    if (!first || !last || last.t - first.t < 16) return
    let vx = (last.x - first.x) / (last.t - first.t)
    let vy = (last.y - first.y) / (last.t - first.t)
    if (Math.hypot(vx, vy) < FLING_MIN_SPEED) return
    let then = performance.now()
    const step = (now: number) => {
      const dt = now - then
      then = now
      drag(vx * dt, vy * dt, scrollsPage)
      const decay = Math.exp(-dt / FLING_DECAY_MS)
      vx *= decay
      vy *= decay
      fling = Math.hypot(vx, vy) < FLING_MIN_SPEED / 2 ? undefined : requestAnimationFrame(step)
    }
    fling = requestAnimationFrame(step)
  }

  onScopeDispose(stopFling)

  function pointerdown(event: PointerEvent) {
    if (event.button !== 0) return
    stopFling()
    const point = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, point)
    if (pointers.size === 1) {
      origin = point
      dragged = false
      pixelsPerUnit = screenMatrix()?.a ?? 1
      samples = [{ t: event.timeStamp, ...point }]
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
      for (const id of pointers.keys()) capture(id)
    }
  }

  function pointermove(event: PointerEvent) {
    const previous = pointers.get(event.pointerId)
    if (!previous) return
    const current = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, current)

    if (pointers.size === 1) {
      if (!dragged && origin && Math.hypot(current.x - origin.x, current.y - origin.y) > DRAG_PX) {
        dragged = true
        capture(event.pointerId)
      }
      drag(current.x - previous.x, current.y - previous.y, event.pointerType !== 'mouse')
      samples.push({ t: event.timeStamp, ...current })
      samples = samples.filter((sample) => event.timeStamp - sample.t <= FLING_SAMPLE_MS)
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDistance > 0) {
        zoomAt(toUser({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), distance / pinchDistance)
      }
      pinchDistance = distance
      dragged = true
    }
  }

  function pointerup(event: PointerEvent) {
    const flung = pointers.size === 1 && dragged && event.type === 'pointerup'
    pointers.delete(event.pointerId)
    pinchDistance = 0
    if (flung) startFling(event.pointerType !== 'mouse')
    samples = []
  }

  function wheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    stopFling()
    zoomAt(toUser({ x: event.clientX, y: event.clientY }), Math.exp(-event.deltaY * WHEEL_RATE))
  }

  function dblclick(event: MouseEvent) {
    if (zoomed.value) reset()
    else zoomAt(toUser({ x: event.clientX, y: event.clientY }), 2.5)
  }

  return {
    transform,
    zoomed,
    atDefault,
    touched,
    zoomBy,
    centerOn,
    reset,
    clamp,
    wasDragged,
    handlers: { pointerdown, pointermove, pointerup, pointercancel: pointerup, wheel, dblclick },
  }
}
