import type { Floor } from './organizations'

export type IsoMapAreaKind =
  | 'corridor'
  | 'room'
  | 'toilet'
  | 'courtyard'
  | 'stage'
  | 'tent'
  | 'stairs'

export type IsoMapAreaIcon = 'elevator' | 'stairs' | 'toilet-men' | 'toilet-women'

export type IsoMapLabelKey =
  | 'avRoomRoute'
  | 'classroom'
  | 'courtyard'
  | 'stage'
  | 'stairs'
  | 'tents'
  | 'toilet'

export interface IsoMapLabel {
  key: IsoMapLabelKey
  detail?: string
}

export interface IsoMapArea {
  id: string
  kind: IsoMapAreaKind
  x: number
  z: number
  w: number
  d: number
  /** 矩形以外の形の場合の輪郭 (時計回り)。x, z は外接矩形として扱う */
  outline?: readonly (readonly [number, number])[]
  icons?: readonly IsoMapAreaIcon[]
  label?: IsoMapLabel
}

export interface IsoMapAnnotation {
  id: string
  x: number
  z: number
  label: IsoMapLabel
}

export interface IsoMapArrow {
  id: string
  x: number
  z: number
  length: number
  labelX: number
  labelZ: number
  label: IsoMapLabel
}

export interface FloorPlan {
  floor: Floor
  areas: IsoMapArea[]
  annotations: IsoMapAnnotation[]
  arrows: IsoMapArrow[]
}

const MAP_W = 66
const ROOM_D = 8
// 隣接する区画は辺を共有し、境界線を一本だけ描画する
const ROOM_GAP = 0
const CORRIDOR_D = 4
const ARM_W = 6
const FRONT_Z = 0
const BOTTOM_Z = 46
const LOWER_CORRIDOR_Z = ROOM_D
const SIDE_ROW_Z = LOWER_CORRIDOR_Z + CORRIDOR_D
const SIDE_ROW_D = 6.5
const TOILET_W = 7
const STAIRS_D = ROOM_D
const UPPER_ROW_COUNT = 6
const CLASSROOM_ROW_X = ARM_W
const CLASSROOM_ROW_W = MAP_W - ARM_W * 2
const CLASSROOM_W = (CLASSROOM_ROW_W - (UPPER_ROW_COUNT - 1) * ROOM_GAP) / UPPER_ROW_COUNT
const SIDE_ROOM_W = CLASSROOM_W
const SIDE_LEFT_ROOM_X = CLASSROOM_ROW_X + CLASSROOM_W
const SIDE_RIGHT_ROOM_X = CLASSROOM_ROW_X + CLASSROOM_W * 4
const STAIRS_W = CLASSROOM_W
const TOILET_LEFT_X = ARM_W + ROOM_GAP
const TOILET_RIGHT_X = MAP_W - ARM_W - ROOM_GAP - TOILET_W
const EAST_ARM_CENTER_X = ARM_W / 2

// 学年は上の階から数える (4F = 1年)
function gradeOf(floor: Floor): number {
  return 5 - floor
}

const CORRIDOR_INNER_Z = LOWER_CORRIDOR_Z + CORRIDOR_D

// 両腕が手前の端まで伸びて横一本でつながる H 字。継ぎ目の線が出ないよう一枚の輪郭にする
const CORRIDOR_OUTLINE: readonly (readonly [number, number])[] = [
  [0, FRONT_Z],
  [ARM_W, FRONT_Z],
  [ARM_W, LOWER_CORRIDOR_Z],
  [MAP_W - ARM_W, LOWER_CORRIDOR_Z],
  [MAP_W - ARM_W, FRONT_Z],
  [MAP_W, FRONT_Z],
  [MAP_W, BOTTOM_Z],
  [MAP_W - ARM_W, BOTTOM_Z],
  [MAP_W - ARM_W, CORRIDOR_INNER_Z],
  [ARM_W, CORRIDOR_INNER_Z],
  [ARM_W, BOTTOM_Z],
  [0, BOTTOM_Z],
]

function corridors(): IsoMapArea[] {
  return [
    {
      id: 'corridor',
      kind: 'corridor',
      x: 0,
      z: FRONT_Z,
      w: MAP_W,
      d: BOTTOM_Z - FRONT_Z,
      outline: CORRIDOR_OUTLINE,
    },
  ]
}

// 1F は南側に教室が無いぶん南廊下が南端まで広く、上階の 1 クラス目の幅だけ伸びて途切れる
const SOUTH_CORRIDOR_EAST_END_X = CLASSROOM_ROW_X + CLASSROOM_W
const SOUTH_CORRIDOR_WEST_END_X = MAP_W - SOUTH_CORRIDOR_EAST_END_X

function firstFloorCorridors(): IsoMapArea[] {
  return [
    {
      id: 'corridor-east',
      kind: 'corridor',
      x: 0,
      z: FRONT_Z,
      w: SOUTH_CORRIDOR_EAST_END_X,
      d: BOTTOM_Z - FRONT_Z,
      outline: [
        [0, FRONT_Z],
        [SOUTH_CORRIDOR_EAST_END_X, FRONT_Z],
        [SOUTH_CORRIDOR_EAST_END_X, CORRIDOR_INNER_Z],
        [ARM_W, CORRIDOR_INNER_Z],
        [ARM_W, BOTTOM_Z],
        [0, BOTTOM_Z],
      ],
    },
    {
      id: 'corridor-west',
      kind: 'corridor',
      x: SOUTH_CORRIDOR_WEST_END_X,
      z: FRONT_Z,
      w: MAP_W - SOUTH_CORRIDOR_WEST_END_X,
      d: BOTTOM_Z - FRONT_Z,
      outline: [
        [SOUTH_CORRIDOR_WEST_END_X, FRONT_Z],
        [MAP_W, FRONT_Z],
        [MAP_W, BOTTOM_Z],
        [MAP_W - ARM_W, BOTTOM_Z],
        [MAP_W - ARM_W, CORRIDOR_INNER_Z],
        [SOUTH_CORRIDOR_WEST_END_X, CORRIDOR_INNER_Z],
      ],
    },
  ]
}

function stairs(floor: Floor): IsoMapArea[] {
  const z = FRONT_Z
  return [
    {
      id: `f${floor}-stairs-east`,
      kind: 'stairs',
      x: -STAIRS_W,
      z,
      w: STAIRS_W,
      d: STAIRS_D,
      icons: ['stairs', 'elevator'],
    },
    {
      id: `f${floor}-stairs-west`,
      kind: 'stairs',
      x: MAP_W,
      z,
      w: STAIRS_W,
      d: STAIRS_D,
      icons: ['stairs', 'elevator'],
    },
  ]
}

function sideRow(floor: Floor): IsoMapArea[] {
  const grade = gradeOf(floor)
  const menOnScreenLeft = floor === 2 || floor === 3
  return [
    {
      id: `f${floor}-toilet-left`,
      kind: 'toilet',
      x: TOILET_LEFT_X,
      z: SIDE_ROW_Z,
      w: TOILET_W,
      d: SIDE_ROW_D,
      // 時計回りの投影では座標上の左側が画面右側に表示される
      icons: [menOnScreenLeft ? 'toilet-women' : 'toilet-men'],
    },
    {
      id: `r${floor}07`,
      kind: 'room',
      x: SIDE_LEFT_ROOM_X,
      z: SIDE_ROW_Z,
      w: SIDE_ROOM_W,
      d: SIDE_ROW_D,
      label: { key: 'classroom', detail: `${grade}-7` },
    },
    {
      id: `r${floor}08`,
      kind: 'room',
      x: SIDE_RIGHT_ROOM_X,
      z: SIDE_ROW_Z,
      w: SIDE_ROOM_W,
      d: SIDE_ROW_D,
      label: { key: 'classroom', detail: `${grade}-8` },
    },
    {
      id: `f${floor}-toilet-right`,
      kind: 'toilet',
      x: TOILET_RIGHT_X,
      z: SIDE_ROW_Z,
      w: TOILET_W,
      d: SIDE_ROW_D,
      icons: [menOnScreenLeft ? 'toilet-men' : 'toilet-women'],
    },
  ]
}

function classroomFloor(floor: Floor): FloorPlan {
  const grade = gradeOf(floor)
  const upperRow: IsoMapArea[] = Array.from({ length: UPPER_ROW_COUNT }, (_, index) => ({
    id: `r${floor}0${index + 1}`,
    kind: 'room' as const,
    x: CLASSROOM_ROW_X + index * (CLASSROOM_W + ROOM_GAP),
    z: FRONT_Z,
    w: CLASSROOM_W,
    d: ROOM_D,
    label: { key: 'classroom' as const, detail: `${grade}-${index + 1}` },
  }))

  return {
    floor,
    areas: [...corridors(), ...upperRow, ...sideRow(floor), ...stairs(floor)],
    annotations: [],
    arrows: [],
  }
}

const COURTYARD_Z = CORRIDOR_INNER_Z

const firstFloorAreas: IsoMapArea[] = [
  ...firstFloorCorridors(),
  {
    id: 'courtyard',
    kind: 'courtyard',
    x: ARM_W,
    z: COURTYARD_Z,
    w: MAP_W - ARM_W * 2,
    d: BOTTOM_Z - COURTYARD_Z,
  },
  { id: 'courtyard-stage', kind: 'stage', x: 26, z: 27, w: 14, d: 6 },
  { id: 'tent-1', kind: 'tent', x: 16, z: 23, w: 4, d: 4 },
  { id: 'tent-2', kind: 'tent', x: 16, z: 30, w: 4, d: 4 },
  { id: 'tent-3', kind: 'tent', x: 22, z: 36, w: 4, d: 4 },
  { id: 'tent-4', kind: 'tent', x: 46, z: 23, w: 4, d: 4 },
  { id: 'tent-5', kind: 'tent', x: 46, z: 30, w: 4, d: 4 },
  { id: 'tent-6', kind: 'tent', x: 40, z: 36, w: 4, d: 4 },
  ...stairs(1),
]

export const floorPlans: FloorPlan[] = [
  {
    floor: 1,
    areas: firstFloorAreas,
    annotations: [
      { id: 'courtyard-label', x: 33, z: 21, label: { key: 'courtyard' } },
      { id: 'stage-label', x: 33, z: 30, label: { key: 'stage' } },
      { id: 'tents-label', x: 33, z: 39, label: { key: 'tents' } },
    ],
    arrows: [
      {
        id: 'av-room-route',
        x: EAST_ARM_CENTER_X,
        z: 30,
        length: 20,
        labelX: -9,
        labelZ: 20,
        label: { key: 'avRoomRoute' },
      },
    ],
  },
  classroomFloor(2),
  classroomFloor(3),
  classroomFloor(4),
]

export const ISO_MAP_FLOORS: readonly Floor[] = [1, 2, 3, 4]
