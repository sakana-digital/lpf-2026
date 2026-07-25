import { floorPlans } from '@/config/isoMap'
import type { FloorPlan } from '@/config/isoMap'
import type { Floor } from '@/config/organizations'
import { areaPath, floorSegments, labelText, planBounds } from './geometry'
import type { IsoMapLabels, MapColors, MapPoint, MapSegment } from './geometry'

export type FloorSelection = Floor | 'all'
export type { IsoMapLabels, MapColors }

export interface IsoMapScene {
  setFloor(selection: FloorSelection, immediate?: boolean): void
  setZoom(zoom: number): void
  pickLabel(clientX: number, clientY: number): string | undefined
  setColors(colors: MapColors): void
  setLabels(labels: IsoMapLabels): void
  resize(width: number, height: number): void
  dispose(): void
}

const VIEW_RADIUS = 49
const STACK_GAP = 9
const HIDDEN_GAP = 4
const LERP_FACTOR = 0.16
const EPSILON = 0.01
const LABEL_HEIGHT = 2.5
const ISO_X = Math.SQRT1_2
const ISO_Y = 1 / Math.sqrt(6)
const ISO_ELEVATION = Math.sqrt(2 / 3)

interface FloorState {
  plan: FloorPlan
  segments: MapSegment[]
  y: number
  targetY: number
  opacity: number
  targetOpacity: number
}

interface LabelHitArea {
  areaId: string
  left: number
  top: number
  right: number
  bottom: number
}

interface LabelOptions {
  areaId?: string
  maxWidth?: number
}

export function createIsoMapScene(
  canvas: HTMLCanvasElement,
  initialLabels: IsoMapLabels,
  initialColors: MapColors,
): IsoMapScene {
  const renderingContext = canvas.getContext('2d')
  if (!renderingContext) throw new Error('Canvas 2D is not supported')
  const context: CanvasRenderingContext2D = renderingContext

  const { cx, cz } = planBounds(floorPlans)
  const floors: FloorState[] = floorPlans.map((plan) => ({
    plan,
    segments: floorSegments(plan),
    y: 0,
    targetY: 0,
    opacity: 0,
    targetOpacity: 0,
  }))

  let labels = initialLabels
  let colors = initialColors
  let raf = 0
  let disposed = false
  let viewportWidth = 0
  let viewportHeight = 0
  let zoom = 1
  let showLabels = true
  let pixelRatio = 1
  let hitAreas: LabelHitArea[] = []

  function scale(): number {
    return (Math.min(viewportWidth, viewportHeight) / (VIEW_RADIUS * 2)) * zoom
  }

  function project(point: MapPoint, elevation = 0): MapPoint {
    const mapX = point.x - cx
    const mapZ = point.z - cz
    const unitScale = scale()
    return {
      // 上面から見て時計回りに 90° 回転したアイソメトリック投影
      x: viewportWidth / 2 - (mapX + mapZ) * ISO_X * unitScale,
      z: viewportHeight / 2 + ((mapX - mapZ) * ISO_Y - elevation * ISO_ELEVATION) * unitScale,
    }
  }

  function drawSegment(segment: MapSegment, elevation: number): void {
    const start = project(segment.start, elevation)
    const end = project(segment.end, elevation)
    context.moveTo(start.x, start.z)
    context.lineTo(end.x, end.z)
  }

  function drawLabel(
    text: string,
    point: MapPoint,
    elevation: number,
    opacity: number,
    options: LabelOptions = {},
  ): void {
    if (!text) return
    const position = project(point, elevation)
    const fontSize = Math.max(8, LABEL_HEIGHT * scale())
    const maxWidth = options.maxWidth ? Math.max(8, options.maxWidth * scale()) : undefined

    context.save()
    context.globalAlpha = opacity
    context.fillStyle = colors.text
    context.font = `${fontSize}px Futura, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const measuredWidth = context.measureText(text).width
    const renderedWidth = maxWidth ? Math.min(measuredWidth, maxWidth) : measuredWidth
    context.fillText(text, position.x, position.z, maxWidth)
    context.restore()

    if (options.areaId && opacity > 0.5) {
      hitAreas.push({
        areaId: options.areaId,
        left: position.x - renderedWidth / 2,
        right: position.x + renderedWidth / 2,
        top: position.z - fontSize / 2,
        bottom: position.z + fontSize / 2,
      })
    }
  }

  function drawFloor(state: FloorState): void {
    if (state.opacity <= EPSILON) return
    const elevation = state.y

    context.save()
    context.globalAlpha = state.opacity * 0.22
    context.fillStyle = colors.toilet
    for (const area of state.plan.areas) {
      if (area.kind !== 'toilet') continue
      areaPath(context, area, (point) => project(point, elevation))
      context.fill()
    }
    context.restore()

    context.save()
    context.globalAlpha = state.opacity
    context.strokeStyle = colors.line
    context.lineWidth = Math.max(1, pixelRatio > 1 ? 0.75 : 1)
    context.lineCap = 'square'
    context.lineJoin = 'miter'
    context.beginPath()
    for (const segment of state.segments) drawSegment(segment, elevation)
    context.stroke()

    for (const arrow of state.plan.arrows) {
      const tipZ = arrow.z - arrow.length
      const head = 2.6
      context.beginPath()
      drawSegment({ start: { x: arrow.x, z: arrow.z }, end: { x: arrow.x, z: tipZ } }, elevation)
      drawSegment(
        { start: { x: arrow.x, z: tipZ }, end: { x: arrow.x - head / 2, z: tipZ + head } },
        elevation,
      )
      drawSegment(
        { start: { x: arrow.x, z: tipZ }, end: { x: arrow.x + head / 2, z: tipZ + head } },
        elevation,
      )
      context.stroke()
    }
    context.restore()

    if (!showLabels) return
    for (const area of state.plan.areas) {
      if (!area.label) continue
      drawLabel(
        labelText(area.label, labels),
        { x: area.x + area.w / 2, z: area.z + area.d / 2 },
        elevation,
        state.opacity,
        { areaId: area.id, maxWidth: Math.max(4, area.w - 0.8) },
      )
    }
    for (const annotation of state.plan.annotations) {
      drawLabel(
        labelText(annotation.label, labels),
        { x: annotation.x, z: annotation.z },
        elevation,
        state.opacity,
      )
    }
    for (const arrow of state.plan.arrows) {
      drawLabel(
        labelText(arrow.label, labels),
        { x: arrow.labelX, z: arrow.labelZ },
        elevation,
        state.opacity,
        { maxWidth: 14 },
      )
    }
    drawLabel(`${state.plan.floor}F`, { x: -8, z: 44 }, elevation, state.opacity, { maxWidth: 7 })
  }

  function render(): void {
    if (!viewportWidth || !viewportHeight) return
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, viewportWidth, viewportHeight)
    hitAreas = []
    for (const state of floors) drawFloor(state)
  }

  function tick(): void {
    raf = 0
    let animating = false
    for (const state of floors) {
      state.y += (state.targetY - state.y) * LERP_FACTOR
      state.opacity += (state.targetOpacity - state.opacity) * LERP_FACTOR
      if (
        Math.abs(state.targetY - state.y) > EPSILON ||
        Math.abs(state.targetOpacity - state.opacity) > EPSILON
      ) {
        animating = true
      } else {
        state.y = state.targetY
        state.opacity = state.targetOpacity
      }
    }
    render()
    if (animating) requestRender()
  }

  function requestRender(): void {
    if (!raf && !disposed) raf = requestAnimationFrame(tick)
  }

  function setFloor(selection: FloorSelection, immediate = false): void {
    showLabels = selection !== 'all'
    floors.forEach((state, index) => {
      if (selection === 'all') {
        state.targetY = index * STACK_GAP - ((floors.length - 1) * STACK_GAP) / 2
        state.targetOpacity = 1
      } else {
        const selected = selection - 1
        state.targetY = (index - selected) * HIDDEN_GAP
        state.targetOpacity = index === selection - 1 ? 1 : 0
      }
      if (immediate) {
        state.y = state.targetY
        state.opacity = state.targetOpacity
      }
    })
    if (immediate) render()
    else requestRender()
  }

  function setZoom(nextZoom: number): void {
    zoom = nextZoom
    requestRender()
  }

  function pickLabel(clientX: number, clientY: number): string | undefined {
    if (!showLabels) return undefined
    const bounds = canvas.getBoundingClientRect()
    const x = clientX - bounds.left
    const y = clientY - bounds.top
    for (let index = hitAreas.length - 1; index >= 0; index -= 1) {
      const area = hitAreas[index]
      if (area && x >= area.left && x <= area.right && y >= area.top && y <= area.bottom) {
        return area.areaId
      }
    }
    return undefined
  }

  function resize(width: number, height: number): void {
    if (!width || !height) return
    viewportWidth = width
    viewportHeight = height
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    requestRender()
  }

  return {
    setFloor,
    setZoom,
    pickLabel,
    setColors(nextColors) {
      colors = nextColors
      requestRender()
    },
    setLabels(nextLabels) {
      labels = nextLabels
      requestRender()
    },
    resize,
    dispose() {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      hitAreas = []
      context.clearRect(0, 0, canvas.width, canvas.height)
    },
  }
}
