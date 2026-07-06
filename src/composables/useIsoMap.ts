import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { createIsoMapScene } from '@/lib/isoMap/scene'
import type { FloorSelection, IsoMapScene, MapColors } from '@/lib/isoMap/scene'

function readColors(): MapColors {
  const styles = getComputedStyle(document.documentElement)
  return {
    fill: styles.getPropertyValue('--color-background-soft').trim(),
    line: styles.getPropertyValue('--color-heading').trim(),
  }
}

export function useIsoMap(canvasRef: Ref<HTMLCanvasElement | null>) {
  const floor = ref<FloorSelection>(1)
  const { resolvedTheme } = useTheme()

  let handle: IsoMapScene | null = null
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const canvas = canvasRef.value
    const container = canvas?.parentElement
    if (!canvas || !container) return

    handle = createIsoMapScene(canvas)
    handle.setColors(readColors())
    handle.setFloor(floor.value, true)
    handle.resize(container.clientWidth, container.clientHeight)

    observer = new ResizeObserver(() => {
      handle?.resize(container.clientWidth, container.clientHeight)
    })
    observer.observe(container)
  })

  watch(resolvedTheme, () => {
    handle?.setColors(readColors())
  })

  function setFloor(selection: FloorSelection) {
    floor.value = selection
    handle?.setFloor(selection)
  }

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    handle?.dispose()
    handle = null
  })

  return { floor, setFloor }
}
