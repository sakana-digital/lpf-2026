import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

interface MasonryOptions {
  laneWidth: number
  gap: number
  maxLanes: number
  /** Selector (within the container) matching each item; items must carry data-index. */
  itemSelector: string
}

interface Position {
  x: number
  y: number
}

// Rough initial height so items are spread out before the real heights arrive,
// avoiding an all-stacked-at-top flash on the first frame.
const ESTIMATED_HEIGHT = 480

/**
 * Row-major masonry via absolute positioning. Items stay put in the DOM and are
 * only moved with transforms, so the embeds inside them are never re-created
 * (and never reload) when the lane count changes on resize.
 */
export function useMasonryLayout(
  container: Ref<HTMLElement | null>,
  itemCount: number,
  options: MasonryOptions,
) {
  const { laneWidth, gap, maxLanes, itemSelector } = options
  const count = ref(1)
  const heights = ref<number[]>(new Array(itemCount).fill(ESTIMATED_HEIGHT))

  let widthObserver: ResizeObserver | undefined
  let itemObserver: ResizeObserver | undefined
  let frame = 0
  let pendingWidth: number | null = null
  const pendingHeights = new Map<number, number>()

  const setCount = (width: number) => {
    const fit = Math.floor((width + gap) / (laneWidth + gap))
    count.value = Math.max(1, Math.min(maxLanes, fit))
  }

  // Coalesce observer notifications into a single rAF so a measurement never
  // triggers another synchronous layout in the same delivery cycle.
  const flush = () => {
    frame = 0
    if (pendingWidth !== null) {
      setCount(pendingWidth)
      pendingWidth = null
    }
    if (pendingHeights.size > 0) {
      pendingHeights.forEach((h, i) => (heights.value[i] = h))
      pendingHeights.clear()
    }
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(flush)
  }

  const columnOf = (index: number) => index % count.value

  const positions = computed<Position[]>(() => {
    const columnHeights: number[] = new Array(count.value).fill(0)
    return Array.from({ length: itemCount }, (_, i) => {
      const col = columnOf(i)
      const y = columnHeights[col] ?? 0
      columnHeights[col] = y + (heights.value[i] ?? ESTIMATED_HEIGHT) + gap
      return { x: col * (laneWidth + gap), y }
    })
  })

  const gridWidth = computed(() => count.value * laneWidth + (count.value - 1) * gap)

  const gridHeight = computed(() => {
    const columnHeights: number[] = new Array(count.value).fill(0)
    heights.value.forEach((h, i) => {
      const col = columnOf(i)
      columnHeights[col] = (columnHeights[col] ?? 0) + h + gap
    })
    return Math.max(0, ...columnHeights.map((h) => h - gap))
  })

  onMounted(() => {
    const el = container.value
    if (!el) return

    const style = getComputedStyle(el)
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    setCount(el.clientWidth - padX)

    widthObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      pendingWidth = entry.contentRect.width
      schedule()
    })
    widthObserver.observe(el)

    itemObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const index = Number((entry.target as HTMLElement).dataset.index)
        if (!Number.isNaN(index)) pendingHeights.set(index, entry.contentRect.height)
      }
      schedule()
    })
    el.querySelectorAll<HTMLElement>(itemSelector).forEach((item) => itemObserver!.observe(item))
  })

  onUnmounted(() => {
    widthObserver?.disconnect()
    itemObserver?.disconnect()
    if (frame) cancelAnimationFrame(frame)
  })

  return { positions, gridWidth, gridHeight }
}
