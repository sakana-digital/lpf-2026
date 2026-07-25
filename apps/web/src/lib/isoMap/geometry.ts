import type { FloorPlan, IsoMapArea, IsoMapLabel, IsoMapLabelKey } from '@/config/isoMap'

export type IsoMapLabels = Record<IsoMapLabelKey, string>

export interface MapColors {
  background: string
  line: string
  text: string
}

export interface MapPoint {
  x: number
  z: number
}

export interface MapSegment {
  start: MapPoint
  end: MapPoint
}

const AXIS_EPSILON = 1e-6

function areaPoints(area: IsoMapArea): MapPoint[] {
  if (area.outline) return area.outline.map(([x, z]) => ({ x, z }))
  return [
    { x: area.x, z: area.z },
    { x: area.x + area.w, z: area.z },
    { x: area.x + area.w, z: area.z + area.d },
    { x: area.x, z: area.z + area.d },
  ]
}

export function areaPath(
  context: CanvasRenderingContext2D,
  area: IsoMapArea,
  project: (point: MapPoint) => MapPoint,
): void {
  const points = areaPoints(area)
  const first = points[0]
  if (!first) return

  const projectedFirst = project(first)
  context.beginPath()
  context.moveTo(projectedFirst.x, projectedFirst.z)
  for (const point of points.slice(1)) {
    const projected = project(point)
    context.lineTo(projected.x, projected.z)
  }
  context.closePath()
}

function coordinateKey(value: number): string {
  return value.toFixed(6)
}

function mergeIntervals(
  intervals: Array<readonly [number, number]>,
): Array<readonly [number, number]> {
  const sorted = [...intervals].sort((left, right) => left[0] - right[0])
  const merged: Array<[number, number]> = []

  for (const [start, end] of sorted) {
    const previous = merged.at(-1)
    if (previous && start <= previous[1] + AXIS_EPSILON) {
      previous[1] = Math.max(previous[1], end)
    } else {
      merged.push([start, end])
    }
  }
  return merged
}

/**
 * 区画ごとの輪郭を、同一直線上では一度だけ描ける線分へまとめる。
 * 廊下と部屋のように長さの違う辺が重なる場合も一本になる。
 */
export function floorSegments(plan: FloorPlan): MapSegment[] {
  const horizontal = new Map<string, { z: number; intervals: Array<readonly [number, number]> }>()
  const vertical = new Map<string, { x: number; intervals: Array<readonly [number, number]> }>()
  const diagonal = new Map<string, MapSegment>()

  for (const area of plan.areas) {
    const points = areaPoints(area)
    points.forEach((start, index) => {
      const end = points[(index + 1) % points.length]
      if (!end) return

      if (Math.abs(start.z - end.z) < AXIS_EPSILON) {
        const key = coordinateKey(start.z)
        const entry = horizontal.get(key) ?? { z: start.z, intervals: [] }
        entry.intervals.push([Math.min(start.x, end.x), Math.max(start.x, end.x)])
        horizontal.set(key, entry)
      } else if (Math.abs(start.x - end.x) < AXIS_EPSILON) {
        const key = coordinateKey(start.x)
        const entry = vertical.get(key) ?? { x: start.x, intervals: [] }
        entry.intervals.push([Math.min(start.z, end.z), Math.max(start.z, end.z)])
        vertical.set(key, entry)
      } else {
        const forward = `${coordinateKey(start.x)},${coordinateKey(start.z)}:${coordinateKey(end.x)},${coordinateKey(end.z)}`
        const reverse = `${coordinateKey(end.x)},${coordinateKey(end.z)}:${coordinateKey(start.x)},${coordinateKey(start.z)}`
        diagonal.set(forward < reverse ? forward : reverse, { start, end })
      }
    })
  }

  return [
    ...[...horizontal.values()].flatMap(({ z, intervals }) =>
      mergeIntervals(intervals).map(([start, end]) => ({
        start: { x: start, z },
        end: { x: end, z },
      })),
    ),
    ...[...vertical.values()].flatMap(({ x, intervals }) =>
      mergeIntervals(intervals).map(([start, end]) => ({
        start: { x, z: start },
        end: { x, z: end },
      })),
    ),
    ...diagonal.values(),
  ]
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

export function labelText(label: IsoMapLabel, labels: IsoMapLabels): string {
  return label.detail || labels[label.key]
}
