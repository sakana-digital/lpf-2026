import * as THREE from 'three'
import type { FloorPlan } from '@/config/venueMap'

export const BLOCK_HEIGHT = 3

export interface FloorMaterials {
  fill: THREE.MeshBasicMaterial
  line: THREE.LineBasicMaterial
}

export function createFloorMaterials(): FloorMaterials {
  return {
    // polygonOffset keeps the edge lines from z-fighting with the faces
    fill: new THREE.MeshBasicMaterial({
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
    line: new THREE.LineBasicMaterial({ transparent: true }),
  }
}

export function planBounds(plans: FloorPlan[]): { cx: number; cz: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const plan of plans) {
    for (const block of [plan.corridor, ...plan.rooms]) {
      minX = Math.min(minX, block.x)
      maxX = Math.max(maxX, block.x + block.w)
      minZ = Math.min(minZ, block.z)
      maxZ = Math.max(maxZ, block.z + block.d)
    }
  }
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 }
}

export function buildFloorGroup(plan: FloorPlan, mats: FloorMaterials): THREE.Group {
  const group = new THREE.Group()
  for (const block of [plan.corridor, ...plan.rooms]) {
    const geom = new THREE.BoxGeometry(block.w, BLOCK_HEIGHT, block.d)
    const mesh = new THREE.Mesh(geom, mats.fill)
    mesh.position.set(block.x + block.w / 2, BLOCK_HEIGHT / 2, block.z + block.d / 2)
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), mats.line)
    edges.position.copy(mesh.position)
    group.add(mesh, edges)
  }
  return group
}

export function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      obj.geometry.dispose()
    }
  })
}
