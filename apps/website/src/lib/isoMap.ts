import type { MapBox, MapPoint } from '@/data/campusMap'

export type Point = MapPoint

/** 2:1 isometric projection: plan x runs down-right, plan y down-left, z up. */
export function project(x: number, y: number, z = 0): Point {
  return { x: x - y, y: (x + y) / 2 - z }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ')
}

export function boxTop(box: MapBox, z: number): string {
  const { x, y, w, h } = box
  return pointsAttr([
    project(x, y, z),
    project(x + w, y, z),
    project(x + w, y + h, z),
    project(x, y + h, z),
  ])
}

export function boxCenter(box: MapBox, z: number): Point {
  return project(box.x + box.w / 2, box.y + box.h / 2, z)
}

/** The two faces of a box that face the viewer, standing from z0 up to z1 */
export function boxFaces(box: MapBox, z0: number, z1: number): { south: string; east: string } {
  const { x, y, w, h } = box
  return {
    south: pointsAttr([
      project(x, y + h, z1),
      project(x + w, y + h, z1),
      project(x + w, y + h, z0),
      project(x, y + h, z0),
    ]),
    east: pointsAttr([
      project(x + w, y, z1),
      project(x + w, y + h, z1),
      project(x + w, y + h, z0),
      project(x + w, y, z0),
    ]),
  }
}

const TOUCH = 1e-6

// The viewer looks in along (-1, -1, -1), so a box lying wholly at smaller x
// or smaller y than another can only ever be behind it
function behind(a: MapBox, b: MapBox): boolean {
  return a.x + a.w <= b.x + TOUCH || a.y + a.h <= b.y + TOUCH
}

/**
 * Back to front. Boxes never overlap in plan, so wherever one lies wholly
 * behind another that pair is ordered; the rest, which cannot hide each
 * other, fall in by their nearest corner.
 */
export function paintOrder<T extends MapBox>(boxes: T[]): T[] {
  const count = boxes.length
  const later: number[][] = boxes.map(() => [])
  const waiting = Array.from({ length: count }, () => 0)
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = boxes[i]!
      const b = boxes[j]!
      const ab = behind(a, b)
      const ba = behind(b, a)
      if (ab && !ba) {
        later[i]!.push(j)
        waiting[j]!++
      } else if (ba && !ab) {
        later[j]!.push(i)
        waiting[i]!++
      }
    }
  }

  const nearness = (index: number) => {
    const box = boxes[index]!
    return box.x + box.w + box.y + box.h
  }
  const done = Array.from({ length: count }, () => false)
  const ready = boxes.map((_, index) => index).filter((index) => waiting[index] === 0)
  const order: T[] = []
  while (order.length < count) {
    if (ready.length === 0) {
      // Only a ring of mutual overlaps gets here; break it at the farthest box
      const rest = boxes.map((_, index) => index).filter((index) => !done[index])
      ready.push(rest.reduce((best, index) => (nearness(index) < nearness(best) ? index : best)))
    }
    ready.sort((a, b) => nearness(a) - nearness(b))
    const index = ready.shift()!
    if (done[index]) continue
    done[index] = true
    order.push(boxes[index]!)
    for (const next of later[index]!) {
      if (--waiting[next]! === 0 && !done[next]) ready.push(next)
    }
  }
  return order
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Screen bounds of boxes lying between z0 and z1, the whole prism included */
export function boxBounds(boxes: MapBox[], z0: number, z1: number): Bounds {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const { x, y, w, h } of boxes) {
    for (const [px, py] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ] as const) {
      for (const z of [z0, z1]) {
        const p = project(px, py, z)
        bounds.minX = Math.min(bounds.minX, p.x)
        bounds.minY = Math.min(bounds.minY, p.y)
        bounds.maxX = Math.max(bounds.maxX, p.x)
        bounds.maxY = Math.max(bounds.maxY, p.y)
      }
    }
  }
  return bounds
}

/** Width of a label in font-size units, treating CJK as full width */
export function textWidth(text: string): number {
  let width = 0
  for (const char of text) {
    width += char.charCodeAt(0) > 0x2e7f ? 1 : 0.6
  }
  return width
}

/** Quarter turns counter-clockwise, seen from above, that the plan is drawn at */
export const MAP_TURNS = 1

function quarterTurns(turns: number): number {
  return ((turns % 4) + 4) % 4
}

/** Rotates a point about the origin a quarter turn counter-clockwise per turn, seen from above */
export function rotatePoint(point: Point, turns = MAP_TURNS): Point {
  let out = point
  for (let i = 0; i < quarterTurns(turns); i++) {
    out = { x: out.y, y: -out.x }
  }
  return out
}

/** Rotates a box about the origin a quarter turn counter-clockwise per turn, seen from above */
export function rotateBox<T extends MapBox>(box: T, turns = MAP_TURNS): T {
  let out = box
  for (let i = 0; i < quarterTurns(turns); i++) {
    out = { ...out, x: out.y, y: -(out.x + out.w), w: out.h, h: out.w }
  }
  return out
}
