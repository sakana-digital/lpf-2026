import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import {
  IDENTITY_QUAT,
  multiplyQuat,
  normalizeVec,
  projectNodes,
  quatFromAxisAngle,
} from '@/lib/sphereGraph'
import type { ProjectedNode, Quat, SphereNode, Vec3 } from '@/lib/sphereGraph'

const ROTATE_PER_PX = 0.006
const DRAG_THRESHOLD = 4
const INERTIA_DECAY = 0.94
const MIN_INERTIA_ANGLE = 0.0004
const MAX_INERTIA_ANGLE = 0.08

export function useSphereGraph(nodes: SphereNode[], containerRef: Ref<HTMLElement | null>) {
  const projected = ref<ProjectedNode[]>([])
  const isDragging = ref(false)

  // 初期姿勢: リングが真横にならないよう軽く傾ける
  let quat: Quat = multiplyQuat(
    quatFromAxisAngle({ x: 1, y: 0, z: 0 }, -0.35),
    multiplyQuat(quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.5), IDENTITY_QUAT),
  )
  let size = { w: 0, h: 0 }
  let pointerId: number | null = null
  let last = { x: 0, y: 0 }
  let moved = 0
  let inertiaAxis: Vec3 = { x: 0, y: 1, z: 0 }
  let inertiaAngle = 0
  let raf = 0
  let observer: ResizeObserver | null = null

  function update() {
    projected.value = projectNodes(nodes, quat, size.w, size.h)
  }

  function rotateBy(dx: number, dy: number) {
    const angle = Math.hypot(dx, dy) * ROTATE_PER_PX
    if (angle === 0) return
    // 画面空間でのトラックボール回転: 横ドラッグは y 軸、縦ドラッグは x 軸
    const axis = normalizeVec({ x: dy, y: dx, z: 0 })
    quat = multiplyQuat(quatFromAxisAngle(axis, angle), quat)
    inertiaAxis = axis
    inertiaAngle = Math.min(angle, MAX_INERTIA_ANGLE)
  }

  function stopInertia() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function inertiaTick() {
    raf = 0
    inertiaAngle *= INERTIA_DECAY
    if (inertiaAngle < MIN_INERTIA_ANGLE) return
    quat = multiplyQuat(quatFromAxisAngle(inertiaAxis, inertiaAngle), quat)
    update()
    raf = requestAnimationFrame(inertiaTick)
  }

  function onPointerDown(event: PointerEvent) {
    pointerId = event.pointerId
    last = { x: event.clientX, y: event.clientY }
    moved = 0
    stopInertia()
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    moved += Math.hypot(dx, dy)
    // しきい値を超えるまでは capture しない（ノードの click を殺さないため）
    if (!isDragging.value) {
      if (moved <= DRAG_THRESHOLD) return
      isDragging.value = true
      containerRef.value?.setPointerCapture(event.pointerId)
    }
    rotateBy(dx, dy)
    last = { x: event.clientX, y: event.clientY }
    update()
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) return
    pointerId = null
    if (isDragging.value) {
      isDragging.value = false
      if (inertiaAngle >= MIN_INERTIA_ANGLE) raf = requestAnimationFrame(inertiaTick)
    }
  }

  onMounted(() => {
    const container = containerRef.value
    if (!container) return

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)

    observer = new ResizeObserver(() => {
      size = { w: container.clientWidth, h: container.clientHeight }
      update()
    })
    observer.observe(container)
    size = { w: container.clientWidth, h: container.clientHeight }
    update()
  })

  onBeforeUnmount(() => {
    stopInertia()
    observer?.disconnect()
    observer = null
    const container = containerRef.value
    if (container) {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
    }
  })

  return { projected, isDragging }
}
