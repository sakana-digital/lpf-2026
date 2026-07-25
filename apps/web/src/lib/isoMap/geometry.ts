import * as THREE from 'three'
import type {
  FloorPlan,
  IsoMapArea,
  IsoMapAreaKind,
  IsoMapLabel,
  IsoMapLabelKey,
} from '@/config/isoMap'

export type IsoMapLabels = Record<IsoMapLabelKey, string>

export interface MapColors {
  toilet: string
  line: string
  text: string
}

export interface FloorMaterials {
  fill: THREE.MeshBasicMaterial
  toilet: THREE.MeshBasicMaterial
  line: THREE.LineBasicMaterial
}

const AREA_Y: Record<IsoMapAreaKind, number> = {
  courtyard: 0,
  corridor: 0.02,
  room: 0.04,
  stairs: 0.04,
  toilet: 0.06,
  stage: 0.08,
  tent: 0.1,
}

const LABEL_HEIGHT = 2.5
const TEXTURE_HEIGHT = 128

function material(opacity = 1): THREE.MeshBasicMaterial {
  const result = new THREE.MeshBasicMaterial({
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity === 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  result.userData.baseOpacity = opacity
  return result
}

function lineMaterial(): THREE.LineBasicMaterial {
  return Object.assign(new THREE.LineBasicMaterial({ transparent: true }), {
    userData: { baseOpacity: 1 },
  })
}

export function createFloorMaterials(): FloorMaterials {
  const fill = material()
  fill.colorWrite = false

  return {
    fill,
    toilet: material(0.22),
    line: lineMaterial(),
  }
}

function blockBounds(block: { x: number; z: number; w: number; d: number }) {
  return {
    minX: block.x,
    maxX: block.x + block.w,
    minZ: block.z,
    maxZ: block.z + block.d,
  }
}

export function planBounds(plans: FloorPlan[]): {
  cx: number
  cz: number
  width: number
  depth: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const plan of plans) {
    for (const area of plan.areas) {
      const bounds = blockBounds(area)
      minX = Math.min(minX, bounds.minX)
      maxX = Math.max(maxX, bounds.maxX)
      minZ = Math.min(minZ, bounds.minZ)
      maxZ = Math.max(maxZ, bounds.maxZ)
    }
  }
  return {
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    width: maxX - minX,
    depth: maxZ - minZ,
  }
}

function labelText(label: IsoMapLabel, labels: IsoMapLabels): string {
  return label.detail || labels[label.key]
}

function createLabelTexture(text: string, textColor: string) {
  const font = '600 68px Futura, sans-serif'
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (measureContext) measureContext.font = font
  const measuredWidth = measureContext?.measureText(text).width ?? text.length * 44

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(64, Math.ceil(measuredWidth + 56))
  canvas.height = TEXTURE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) {
    const texture = new THREE.CanvasTexture(canvas)
    return { texture, aspect: canvas.width / canvas.height }
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = textColor
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  return { texture, aspect: canvas.width / canvas.height }
}

interface LabelData {
  label?: IsoMapLabel
  text?: string
  maxWidth?: number
}

function spriteText(data: LabelData, labels: IsoMapLabels) {
  if (data.text) return data.text
  return data.label ? labelText(data.label, labels) : ''
}

function updateLabelSprite(sprite: THREE.Sprite, labels: IsoMapLabels, colors: MapColors): void {
  const data = sprite.userData.label as LabelData
  const text = spriteText(data, labels)
  const textColor = colors.text
  const material = sprite.material as THREE.SpriteMaterial
  material.map?.dispose()
  const { texture, aspect } = createLabelTexture(text, textColor)
  material.map = texture
  material.needsUpdate = true

  let height = LABEL_HEIGHT
  let width = height * aspect
  if (data.maxWidth && width > data.maxWidth) {
    const scale = data.maxWidth / width
    width *= scale
    height *= scale
  }
  sprite.scale.set(width, height, 1)
}

function createLabelSprite(data: LabelData, labels: IsoMapLabels, colors: MapColors): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  )
  sprite.userData.label = data
  sprite.renderOrder = 20
  updateLabelSprite(sprite, labels, colors)
  return sprite
}

// 輪郭付きの区画は絶対座標で三角形分割するため、原点基準で配置する
function areaGeometry(area: IsoMapArea): { geometry: THREE.BufferGeometry; offset: THREE.Vector3 } {
  if (area.outline) {
    const shape = new THREE.Shape(area.outline.map(([x, z]) => new THREE.Vector2(x, z)))
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateX(Math.PI / 2)
    return { geometry, offset: new THREE.Vector3(0, 0, 0) }
  }
  const geometry = new THREE.PlaneGeometry(area.w, area.d)
  geometry.rotateX(-Math.PI / 2)
  return {
    geometry,
    offset: new THREE.Vector3(area.x + area.w / 2, 0, area.z + area.d / 2),
  }
}

function createArea(area: IsoMapArea, mats: FloorMaterials): THREE.Group {
  const group = new THREE.Group()
  const { geometry, offset } = areaGeometry(area)
  const mesh = new THREE.Mesh(geometry, area.kind === 'toilet' ? mats.toilet : mats.fill)
  const y = AREA_Y[area.kind]
  mesh.position.set(offset.x, y, offset.z)
  mesh.renderOrder = Math.round(y * 100)

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), mats.line)
  edges.position.set(offset.x, y + 0.02, offset.z)
  edges.renderOrder = mesh.renderOrder + 1
  group.add(mesh, edges)
  return group
}

function createArrowGeometry(x: number, z: number, length: number): THREE.BufferGeometry {
  const head = 2.6
  const tipZ = z - length
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 0.14, z),
    new THREE.Vector3(x, 0.14, tipZ),
    new THREE.Vector3(x, 0.14, tipZ),
    new THREE.Vector3(x - head / 2, 0.14, tipZ + head),
    new THREE.Vector3(x, 0.14, tipZ),
    new THREE.Vector3(x + head / 2, 0.14, tipZ + head),
  ])
}

export function buildFloorGroup(
  plan: FloorPlan,
  mats: FloorMaterials,
  labels: IsoMapLabels,
  colors: MapColors,
): THREE.Group {
  const group = new THREE.Group()

  for (const area of plan.areas) {
    group.add(createArea(area, mats))
    if (area.label) {
      const sprite = createLabelSprite(
        {
          label: area.label,
          maxWidth: Math.max(4, area.w - 0.8),
        },
        labels,
        colors,
      )
      sprite.userData.areaId = area.id
      sprite.position.set(area.x + area.w / 2, 0.6, area.z + area.d / 2)
      group.add(sprite)
    }
  }

  for (const annotation of plan.annotations) {
    const sprite = createLabelSprite({ label: annotation.label }, labels, colors)
    sprite.position.set(annotation.x, 0.6, annotation.z)
    group.add(sprite)
  }

  for (const arrow of plan.arrows) {
    const line = new THREE.LineSegments(
      createArrowGeometry(arrow.x, arrow.z, arrow.length),
      mats.line,
    )
    line.renderOrder = 10
    group.add(line)

    const sprite = createLabelSprite({ label: arrow.label, maxWidth: 14 }, labels, colors)
    sprite.position.set(arrow.labelX, 0.7, arrow.labelZ)
    group.add(sprite)
  }

  const floorLabel = createLabelSprite({ text: `${plan.floor}F`, maxWidth: 7 }, labels, colors)
  floorLabel.position.set(-8, 0.7, 44)
  group.add(floorLabel)

  return group
}

export function updateGroupLabels(
  group: THREE.Group,
  labels: IsoMapLabels,
  colors: MapColors,
): void {
  group.traverse((object) => {
    if (object instanceof THREE.Sprite && object.userData.label) {
      updateLabelSprite(object, labels, colors)
    }
  })
}

export function disposeGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments
    ) {
      object.geometry.dispose()
    }
    if (object instanceof THREE.Sprite) {
      const material = object.material as THREE.SpriteMaterial
      material.map?.dispose()
      material.dispose()
    }
  })
}

export function disposeMaterials(mats: FloorMaterials): void {
  mats.fill.dispose()
  mats.toilet.dispose()
  mats.line.dispose()
}
