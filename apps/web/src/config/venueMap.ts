import type { Floor } from './organizations'

export interface RoomBlock {
  id: string
  x: number
  z: number
  w: number
  d: number
  label?: string
}

export interface FloorPlan {
  floor: Floor
  corridor: { x: number; z: number; w: number; d: number }
  rooms: RoomBlock[]
}

const ROOM_W = 8
const ROOM_D = 8
const ROOM_GAP = 0.5
const CORRIDOR_D = 3
const ROOMS_PER_FLOOR = 8
const FLOOR_W = ROOMS_PER_FLOOR * ROOM_W + (ROOMS_PER_FLOOR - 1) * ROOM_GAP

function classroomFloor(floor: Floor): FloorPlan {
  const rooms: RoomBlock[] = []
  for (let i = 0; i < ROOMS_PER_FLOOR; i++) {
    rooms.push({
      id: `r${floor}0${i + 1}`,
      x: i * (ROOM_W + ROOM_GAP),
      z: 0,
      w: ROOM_W,
      d: ROOM_D,
    })
  }
  return {
    floor,
    corridor: { x: 0, z: ROOM_D + ROOM_GAP, w: FLOOR_W, d: CORRIDOR_D },
    rooms,
  }
}

export const floorPlans: FloorPlan[] = [
  {
    floor: 1,
    corridor: { x: 0, z: ROOM_D + ROOM_GAP, w: FLOOR_W, d: CORRIDOR_D },
    rooms: [
      { id: 'r101', x: 0, z: 0, w: 16, d: ROOM_D, label: 'avRoom' },
      { id: 'r102', x: 16.5, z: 0, w: 12, d: ROOM_D, label: 'staffRoom' },
      { id: 'r103', x: 29, z: 0, w: 14, d: ROOM_D, label: 'entrance' },
      { id: 'r104', x: 43.5, z: 0, w: 24, d: ROOM_D, label: 'hall' },
    ],
  },
  classroomFloor(2),
  classroomFloor(3),
  classroomFloor(4),
]

export const FLOORS: readonly Floor[] = [1, 2, 3, 4]
