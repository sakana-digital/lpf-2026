import * as THREE from 'three'
import { floorPlans } from '@/config/venueMap'
import type { Floor } from '@/config/organizations'
import {
  BLOCK_HEIGHT,
  buildFloorGroup,
  createFloorMaterials,
  disposeGroup,
  planBounds,
} from './geometry'
import type { FloorMaterials } from './geometry'

export type FloorSelection = Floor | 'all'

export interface MapColors {
  fill: string
  line: string
}

export interface IsoMapScene {
  setFloor(selection: FloorSelection, immediate?: boolean): void
  setColors(colors: MapColors): void
  resize(width: number, height: number): void
  dispose(): void
}

const STACK_GAP = BLOCK_HEIGHT * 3
const HIDDEN_GAP = 4
const VIEW_RADIUS = 42
const LERP_FACTOR = 0.16
const EPSILON = 0.01

// CSS 変数は oklch のまま渡ってくるため、2D canvas で一度描画して sRGB に解決する
function cssColorToThree(css: string): THREE.Color {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return new THREE.Color('#808080')
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r = 128, g = 128, b = 128] = ctx.getImageData(0, 0, 1, 1).data
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

export function createIsoMapScene(canvas: HTMLCanvasElement): IsoMapScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500)
  camera.position.set(100, 100, 100)
  camera.lookAt(0, 0, 0)

  const { cx, cz } = planBounds(floorPlans)

  const floors: FloorState[] = floorPlans.map((plan) => {
    const mats = createFloorMaterials()
    const group = buildFloorGroup(plan, mats)
    group.position.set(-cx, 0, -cz)
    scene.add(group)
    return { group, mats, y: 0, targetY: 0, opacity: 0, targetOpacity: 0 }
  })

  let raf = 0
  let disposed = false

  function apply(state: FloorState) {
    state.group.position.y = state.y
    state.group.visible = state.opacity > EPSILON
    state.mats.fill.opacity = state.opacity
    state.mats.line.opacity = state.opacity
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
    floors.forEach((state, i) => {
      if (selection === 'all') {
        state.targetY = i * STACK_GAP - ((floors.length - 1) * STACK_GAP) / 2
        state.targetOpacity = 1
      } else {
        const selected = selection - 1
        state.targetY = (i - selected) * HIDDEN_GAP
        state.targetOpacity = i === selected ? 1 : 0
      }
      if (immediate) {
        state.y = state.targetY
        state.opacity = state.targetOpacity
        apply(state)
      }
    })
    requestRender()
  }

  function setColors(colors: MapColors) {
    const fill = cssColorToThree(colors.fill)
    const line = cssColorToThree(colors.line)
    for (const state of floors) {
      state.mats.fill.color.copy(fill)
      state.mats.line.color.copy(line)
    }
    requestRender()
  }

  function resize(width: number, height: number) {
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    const aspect = width / height
    const halfH = aspect >= 1 ? VIEW_RADIUS : VIEW_RADIUS / aspect
    camera.top = halfH
    camera.bottom = -halfH
    camera.left = -halfH * aspect
    camera.right = halfH * aspect
    camera.updateProjectionMatrix()
    requestRender()
  }

  return {
    setFloor,
    setColors,
    resize,
    dispose() {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      for (const state of floors) {
        disposeGroup(state.group)
        state.mats.fill.dispose()
        state.mats.line.dispose()
      }
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
