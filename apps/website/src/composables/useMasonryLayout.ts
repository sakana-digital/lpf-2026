import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

interface MasonryOptions {
  /** Minimum lane width; also decides how many lanes fit. */
  laneWidth: number
  /** Lanes stretch up to this width when the container has room. Defaults to laneWidth (fixed lanes). */
  maxLaneWidth?: number
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
 * Shortest-column masonry via absolute positioning. Items stay put in the DOM
 * and are only moved with transforms, so the embeds inside them are never
 * re-created (and never reload) when the lane count changes on resize.
 *
 * The lanes are centred through the item positions rather than by giving the
 * container an explicit pixel width: a fixed width on the measured element
 * feeds its own intrinsic size back into ancestors that size to content, which
 * pins the measurement to the widest lane layout and never lets it shrink.
 */
export function useMasonryLayout(
  container: Ref<HTMLElement | null>,
  itemCount: number,
  options: MasonryOptions,
) {
  const { laneWidth: minLaneWidth, gap, maxLanes, itemSelector } = options
  const maxLaneWidth = options.maxLaneWidth ?? options.laneWidth
  const containerWidth = ref(0)
  const heights = ref<number[]>(new Array(itemCount).fill(ESTIMATED_HEIGHT))

  let widthObserver: ResizeObserver | undefined
  let itemObserver: ResizeObserver | undefined
  let frame = 0
  let pendingWidth: number | null = null
  const pendingHeights = new Map<number, number>()

  // Coalesce observer notifications into a single rAF so a measurement never
  // triggers another synchronous layout in the same delivery cycle.
  const flush = () => {
    frame = 0
    if (pendingWidth !== null) {
      containerWidth.value = pendingWidth
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

  const count = computed(() => {
    const fit = Math.floor((containerWidth.value + gap) / (minLaneWidth + gap))
    return Math.max(1, Math.min(maxLanes, fit))
  })

  // Distribute leftover space across lanes, capped at maxLaneWidth. On containers
  // narrower than a single minimum lane, the lane shrinks to the container width.
  const laneWidth = computed(() => {
    if (containerWidth.value <= 0) return minLaneWidth
    const available = (containerWidth.value - (count.value - 1) * gap) / count.value
    return Math.min(maxLaneWidth, available)
  })

  const gridWidth = computed(() => count.value * laneWidth.value + (count.value - 1) * gap)

  const offsetX = computed(() => Math.max(0, (containerWidth.value - gridWidth.value) / 2))

  // Each item goes to the shortest column so lanes stay level; ties take the
  // leftmost, which keeps the initial (equal-height) pass in source order.
  const layout = computed(() => {
    const columnHeights: number[] = new Array(count.value).fill(0)
    const positions: Position[] = []
    for (let i = 0; i < itemCount; i++) {
      let col = 0
      for (let c = 1; c < columnHeights.length; c++) {
        if ((columnHeights[c] ?? 0) < (columnHeights[col] ?? 0)) col = c
      }
      const y = columnHeights[col] ?? 0
      positions.push({ x: offsetX.value + col * (laneWidth.value + gap), y })
      columnHeights[col] = y + (heights.value[i] ?? ESTIMATED_HEIGHT) + gap
    }
    return { positions, columnHeights }
  })

  const positions = computed(() => layout.value.positions)

  const gridHeight = computed(() => Math.max(0, ...layout.value.columnHeights.map((h) => h - gap)))

  onMounted(() => {
    const el = container.value
    if (!el) return

    const style = getComputedStyle(el)
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    containerWidth.value = el.clientWidth - padX

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

  return { positions, gridWidth, gridHeight, laneWidth }
}
