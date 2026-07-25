import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { createIsoMapScene } from '@/lib/isoMap/scene'
import type { FloorSelection, IsoMapLabels, IsoMapScene, MapColors } from '@/lib/isoMap/scene'

const MIN_ZOOM = 0.75
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.25

interface IsoMapInteractionOptions {
  onLabelClick?(areaId: string): void
  isLabelInteractive?(areaId: string): boolean
}

function readColors(): MapColors {
  const styles = getComputedStyle(document.documentElement)
  return {
    background: styles.getPropertyValue('--color-background').trim(),
    line: styles.getPropertyValue('--color-heading').trim(),
    text: styles.getPropertyValue('--color-heading').trim(),
  }
}

export function useIsoMap(
  canvasRef: Ref<HTMLCanvasElement | null>,
  iconLayerRef: Ref<SVGGElement | null>,
  labels: ComputedRef<IsoMapLabels>,
  interactions: IsoMapInteractionOptions = {},
) {
  const floor = ref<FloorSelection>(1)
  const zoom = ref(1)
  const canZoomIn = computed(() => zoom.value < MAX_ZOOM)
  const canZoomOut = computed(() => zoom.value > MIN_ZOOM)
  const { resolvedTheme } = useTheme()

  let handle: IsoMapScene | null = null
  let observer: ResizeObserver | null = null
  let canvas: HTMLCanvasElement | null = null

  function setZoom(nextZoom: number) {
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    handle?.setZoom(zoom.value)
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault()
    setZoom(zoom.value * Math.exp(-event.deltaY * 0.0015))
  }

  function interactiveLabelAt(event: MouseEvent): string | undefined {
    const areaId = handle?.pickLabel(event.clientX, event.clientY)
    if (!areaId || interactions.isLabelInteractive?.(areaId) === false) return undefined
    return areaId
  }

  function handleClick(event: MouseEvent) {
    const areaId = interactiveLabelAt(event)
    if (areaId) interactions.onLabelClick?.(areaId)
  }

  function handlePointerMove(event: PointerEvent) {
    if (canvas) canvas.style.cursor = interactiveLabelAt(event) ? 'pointer' : ''
  }

  onMounted(() => {
    canvas = canvasRef.value
    const iconLayer = iconLayerRef.value
    const container = canvas?.parentElement
    if (!canvas || !iconLayer || !container) return

    handle = createIsoMapScene(canvas, iconLayer, labels.value, readColors())
    handle.setZoom(zoom.value)
    handle.setFloor(floor.value, true)
    handle.resize(container.clientWidth, container.clientHeight)

    observer = new ResizeObserver(() => {
      handle?.resize(container.clientWidth, container.clientHeight)
    })
    observer.observe(container)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('pointermove', handlePointerMove)
  })

  watch(resolvedTheme, () => {
    handle?.setColors(readColors())
  })

  watch(labels, (nextLabels) => {
    handle?.setLabels(nextLabels)
  })

  function setFloor(selection: FloorSelection) {
    floor.value = selection
    handle?.setFloor(selection)
  }

  function zoomIn() {
    setZoom(zoom.value + ZOOM_STEP)
  }

  function zoomOut() {
    setZoom(zoom.value - ZOOM_STEP)
  }

  function resetZoom() {
    setZoom(1)
  }

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    canvas?.removeEventListener('wheel', handleWheel)
    canvas?.removeEventListener('click', handleClick)
    canvas?.removeEventListener('pointermove', handlePointerMove)
    canvas = null
    handle?.dispose()
    handle = null
  })

  return { floor, zoom, canZoomIn, canZoomOut, setFloor, zoomIn, zoomOut, resetZoom }
}
