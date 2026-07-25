import * as THREE from 'three'
import { floorPlans } from '@/config/isoMap'
import type { Floor } from '@/config/organizations'
import {
  buildFloorGroup,
  createFloorMaterials,
  disposeGroup,
  disposeMaterials,
  planBounds,
  updateGroupLabels,
} from './geometry'
import type { FloorMaterials, IsoMapLabels, MapColors } from './geometry'

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

function cssColorToThree(css: string): THREE.Color {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return new THREE.Color('#808080')
  context.fillStyle = css
  context.fillRect(0, 0, 1, 1)
  const [r = 128, g = 128, b = 128] = context.getImageData(0, 0, 1, 1).data
  return new THREE.Color(r / 255, g / 255, b / 255)
}

interface FloorState {
  group: THREE.Group
  mats: FloorMaterials
  y: number
  targetY: number
  opacity: number
  targetOpacity: number
}

function setMaterialOpacity(material: THREE.Material, opacity: number): void {
  const baseOpacity = (material.userData.baseOpacity as number | undefined) ?? 1
  material.opacity = baseOpacity * opacity
  material.transparent = true
  material.depthWrite = material.opacity >= 0.999
  material.depthFunc = THREE.LessEqualDepth
  material.stencilWrite = false
}

function applyOpacity(state: FloorState, showLabels: boolean): void {
  setMaterialOpacity(state.mats.fill, state.opacity)
  setMaterialOpacity(state.mats.toilet, state.opacity)
  setMaterialOpacity(state.mats.line, state.opacity)
  state.group.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      object.visible = showLabels
      object.material.opacity = state.opacity
    }
  })
}

export function createIsoMapScene(
  canvas: HTMLCanvasElement,
  initialLabels: IsoMapLabels,
  initialColors: MapColors,
): IsoMapScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500)
  camera.position.set(100, 100, -100)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()

  const { cx, cz } = planBounds(floorPlans)
  let labels = initialLabels
  let colors = initialColors

  const floors: FloorState[] = floorPlans.map((plan) => {
    const mats = createFloorMaterials()
    const group = buildFloorGroup(plan, mats, labels, colors)
    group.position.set(-cx, 0, -cz)
    scene.add(group)
    return {
      group,
      mats,
      y: 0,
      targetY: 0,
      opacity: 0,
      targetOpacity: 0,
    }
  })

  let raf = 0
  let disposed = false
  let viewportWidth = 0
  let viewportHeight = 0
  let zoom = 1
  let showLabels = true
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  function apply(state: FloorState) {
    state.group.position.set(-cx, state.y, -cz)
    state.group.visible = state.opacity > EPSILON
    applyOpacity(state, showLabels)
  }

  function tick() {
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
      apply(state)
    }
    renderer.render(scene, camera)
    if (animating) requestRender()
  }

  function requestRender() {
    if (!raf && !disposed) raf = requestAnimationFrame(tick)
  }

  function setFloor(selection: FloorSelection, immediate = false) {
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
        apply(state)
      }
    })
    requestRender()
  }

  function updateCamera() {
    if (viewportWidth === 0 || viewportHeight === 0) return
    const aspect = viewportWidth / viewportHeight
    const baseHalfHeight = aspect >= 1 ? VIEW_RADIUS : VIEW_RADIUS / aspect
    const halfHeight = baseHalfHeight / zoom
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.updateProjectionMatrix()
    requestRender()
  }

  function setZoom(nextZoom: number) {
    zoom = nextZoom
    updateCamera()
  }

  function pickLabel(clientX: number, clientY: number): string | undefined {
    if (!showLabels) return undefined
    const bounds = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const intersections = raycaster.intersectObjects(
      floors.filter((state) => state.group.visible).map((state) => state.group),
      true,
    )
    for (const intersection of intersections) {
      if (!(intersection.object instanceof THREE.Sprite)) continue
      const areaId = intersection.object.userData.areaId
      if (typeof areaId === 'string') return areaId
    }
    return undefined
  }

  function setColors(nextColors: MapColors) {
    colors = nextColors
    for (const state of floors) {
      state.mats.toilet.color.copy(cssColorToThree(colors.toilet))
      state.mats.line.color.copy(cssColorToThree(colors.line))
      updateGroupLabels(state.group, labels, colors)
    }
    requestRender()
  }

  function setLabels(nextLabels: IsoMapLabels) {
    labels = nextLabels
    for (const state of floors) updateGroupLabels(state.group, labels, colors)
    requestRender()
  }

  function resize(width: number, height: number) {
    if (width === 0 || height === 0) return
    viewportWidth = width
    viewportHeight = height
    renderer.setSize(viewportWidth, viewportHeight, false)
    updateCamera()
  }

  setColors(initialColors)

  return {
    setFloor,
    setZoom,
    pickLabel,
    setColors,
    setLabels,
    resize,
    dispose() {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      for (const state of floors) {
        disposeGroup(state.group)
        disposeMaterials(state.mats)
      }
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
