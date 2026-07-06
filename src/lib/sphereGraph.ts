import { grades } from '@/config/organizations'
import type { Organization } from '@/config/organizations'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Quat {
  x: number
  y: number
  z: number
  w: number
}

export interface SphereNode {
  id: string
  kind: 'group' | 'leaf'
  orgId?: string
  labelKey: string
  labelParams?: Record<string, unknown>
  position: Vec3
}

export interface SphereEdge {
  from: string
  to: string
}

export interface ProjectedNode {
  id: string
  x: number
  y: number
  scale: number
  opacity: number
  zIndex: number
}

export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 }

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle / 2
  const s = Math.sin(half)
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) }
}

export function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}

export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y
  const iy = q.w * v.y + q.z * v.x - q.x * v.z
  const iz = q.w * v.z + q.x * v.y - q.y * v.x
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  }
}

export function normalizeVec(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z)
  if (len === 0) return { x: 0, y: 1, z: 0 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function spherePoint(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.sin(lon),
  }
}

// 学年ごとに緯度帯のリングを作り、その少し上にグループノードを置く
export function buildOrganizationSphere(orgs: Organization[]): {
  nodes: SphereNode[]
  edges: SphereEdge[]
} {
  const nodes: SphereNode[] = []
  const edges: SphereEdge[] = []

  grades.forEach((grade, gi) => {
    const lat = (gi - 1) * 42
    const groupId = `grade-${grade}`
    nodes.push({
      id: groupId,
      kind: 'group',
      labelKey: 'explore.events.gradeHeader',
      labelParams: { grade },
      position: spherePoint(lat + 16, gi * 120 + 45),
    })

    const classes = orgs.filter((org) => org.kind === 'class' && org.grade === grade)
    classes.forEach((org, j) => {
      const lon = (360 / classes.length) * j + gi * 22
      nodes.push({
        id: org.id,
        kind: 'leaf',
        orgId: org.id,
        labelKey: 'explore.events.classLabel',
        labelParams: { grade, classNo: org.kind === 'class' ? org.classNo : 0 },
        position: spherePoint(lat, lon),
      })
      edges.push({ from: groupId, to: org.id })
    })
  })

  return { nodes, edges }
}

export function projectNodes(
  nodes: SphereNode[],
  q: Quat,
  width: number,
  height: number,
): ProjectedNode[] {
  const radius = Math.max(0, Math.min(width, height) / 2 - 56)
  const cx = width / 2
  const cy = height / 2
  return nodes.map((node) => {
    const p = rotateVec(q, node.position)
    const depth = (p.z + 1) / 2
    return {
      id: node.id,
      x: cx + p.x * radius,
      y: cy - p.y * radius,
      scale: 0.7 + depth * 0.45,
      opacity: 0.3 + depth * 0.7,
      zIndex: Math.round(depth * 100),
    }
  })
}
