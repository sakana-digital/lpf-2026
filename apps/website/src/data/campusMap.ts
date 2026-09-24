import type { LocalizedText } from '@shared/locale'
import { named, tent as placeInTent, venue } from '@shared/organizations'
import type { OrgPlace, TentLetter } from '@shared/organizations'
import type { MapIconName } from '@/lib/mapIcons'

/**
 * The school seen from above, north up, in metres from the north-west corner
 * of the west wing. Everything is an axis-aligned box read off the floor guide
 * boards (one photo per floor, rectified onto the plate's outer walls), so a
 * room is four numbers; the isometric projection happens at render time. Room
 * ids are the numbers printed on the boards, which is what OrgPlace rooms and
 * the festival programme use.
 */
export interface MapBox {
  x: number
  y: number
  w: number
  h: number
}

export interface RoomKindSpec {
  /** How high the walls stand; 0 lies flat on the plate */
  height: number
  /** Whether a group can be placed there, which is what makes it clickable */
  linkable: boolean
  /** A roof on walls, a tinted patch, an outlined patch with a symbol, or a dashed hole */
  surface: 'roof' | 'flat' | 'outline' | 'void'
  /** Symbols drawn on the box, side by side */
  icon?: readonly MapIconName[]
}

export type MapRoomKind = 'room' | 'hall' | 'yard' | 'stairs' | 'wc' | 'elevator' | 'void' | 'tent'

export const ROOM_KINDS: Record<MapRoomKind, RoomKindSpec> = {
  room: { height: 3, linkable: true, surface: 'roof' },
  hall: { height: 0, linkable: true, surface: 'flat' },
  yard: { height: 0, linkable: true, surface: 'flat' },
  stairs: { height: 0, linkable: false, surface: 'outline', icon: ['stairs'] },
  wc: { height: 0, linkable: false, surface: 'outline', icon: ['wc'] },
  elevator: { height: 0, linkable: false, surface: 'outline', icon: ['elevator', 'stairs'] },
  void: { height: 0, linkable: false, surface: 'void' },
  tent: { height: 2.5, linkable: true, surface: 'roof' },
}

export interface MapRoom extends MapBox {
  id: string
  kind: MapRoomKind
  name?: LocalizedText
  /** Printed on the box instead of the id */
  label?: string
  /** Coloured like a place with a group, without being one */
  featured?: boolean
  /** Printed on the box by name rather than number, for a room visitors know by name */
  byName?: boolean
  /** Further boxes of the same room, for one that is not a rectangle */
  parts?: MapBox[]
  /**
   * Places the programme puts here under another name: the timetable venues,
   * spelled-out spots. A room answers to its own number and name without being
   * told.
   */
  places?: OrgPlace[]
}

export interface MapPoint {
  x: number
  y: number
}

export type FloorLevel = 1 | 2 | 3 | 4

export interface MapFloor {
  level: FloorLevel
  /** Floor plate, as boxes that may overlap; drawn as one slab */
  slab: MapBox[]
  /** Open ground around the plate, for what happens outdoors */
  ground?: MapBox[]
  rooms: MapRoom[]
  /** Corridor and stair entrances the programme bars, past which visitors may not go */
  noEntry?: MapPoint[]
  /** Stretches of ground left out of the drawing, shown as a dashed line */
  omitted?: { from: MapPoint; to: MapPoint }[]
}

// The plate: two wings joined by a bar of classrooms along the south, a
// corridor bridging the courtyard, and an annex hanging off the south-east
const PLATE_H = 94.5
const WING_W: MapBox = { x: 0, y: 0, w: 19.3, h: PLATE_H }
const WING_E: MapBox = { x: 46.8, y: 0, w: 19.2, h: PLATE_H }
const SOUTH_BAR: MapBox = { x: 0, y: 80.5, w: 66, h: 14 }
const BRIDGE: MapBox = { x: 19.3, y: 20.6, w: 27.5, h: 2.3 }
const NORTH_STAIR: MapBox = { x: 27.5, y: 8, w: 2.5, h: 3.2 }
// The annex hangs off the east end of the classroom row; the courtyard side
// of it, south of the first classroom, is open air, except where the ground
// floor's memorial room and the library above it reach back west
// A corridor runs down its courtyard side on every floor, no wider than the
// gap between the last classroom and the annex's own rooms; on the lower two
// floors it reaches a fan of steps and the rooms across the bottom
const walk = (from: number, to: number, y: number, h = 12): MapBox => ({
  x: from,
  y,
  w: to - from,
  h,
})
const ANNEX_1F: MapBox[] = [
  { x: 57.3, y: 92.5, w: 14.7, h: 27 },
  walk(54.7, 57.3, 92.5),
  { x: 46.8, y: 104, w: 10.5, h: 16 },
]
const ANNEX_2F: MapBox[] = [
  { x: 57.7, y: PLATE_H, w: 14.3, h: 28.5 },
  walk(54.7, 57.7, PLATE_H),
  { x: 46.6, y: 104, w: 11.4, h: 19 },
]
const ANNEX_3F: MapBox[] = [{ x: 58, y: PLATE_H, w: 14, h: 26 }, walk(54.7, 58, PLATE_H, 26)]
const ANNEX_4F: MapBox = { x: 57.5, y: PLATE_H, w: 10.5, h: 20 }
// The block off the bridge that holds the machine shop on the ground floor,
// with its stair tower; its roof is an open deck on the floor above, which
// also runs south over 118, a room standing by itself in the courtyard
const NORTH_BLOCK: MapBox[] = [
  { x: 27.5, y: 11, w: 2.5, h: 12 },
  { x: 30, y: 12.6, w: 17, h: 10.4 },
]
const NORTH_DECK: MapBox[] = [...NORTH_BLOCK, { x: 30, y: 23, w: 10.8, h: 9.5 }]

function feature(
  kind: MapRoomKind,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  name?: LocalizedText,
  places?: OrgPlace[],
): MapRoom {
  return { id, kind, x, y, w, h, ...(name ? { name } : {}), ...(places ? { places } : {}) }
}

function box(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  ja?: string,
  places?: OrgPlace[],
): MapRoom {
  return feature('room', id, x, y, w, h, ja ? { ja } : undefined, places)
}

function hall(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  name: LocalizedText,
  places?: OrgPlace[],
): MapRoom {
  return feature('hall', id, x, y, w, h, name, places)
}

function stairs(x: number, y: number, w: number, h: number): MapRoom {
  return feature('stairs', 'stairs', x, y, w, h)
}

function wc(x: number, y: number, w: number, h: number): MapRoom {
  return feature('wc', 'wc', x, y, w, h)
}

function elevator(x: number, y: number, w: number, h: number): MapRoom {
  return feature('elevator', 'elevator', x, y, w, h)
}

function tent(letter: TentLetter, x: number, y: number, w: number, h: number): MapRoom {
  const id = `tent-${letter}`
  return { ...feature('tent', id, x, y, w, h, undefined, [placeInTent(letter)]), label: letter }
}

// The ground floor stops short of the classrooms above it: its south wall is
// the entrance halls, with the annex reached from the main entrance
const floor1: MapFloor = {
  level: 1,
  slab: [
    { ...WING_W, h: 92.5 },
    { ...WING_E, h: 92.5 },
    { x: 40.9, y: 87.7, w: 19.1, h: 5.8 },
    ...NORTH_BLOCK,
    { ...BRIDGE, w: 8.5 },
    ...ANNEX_1F,
  ],
  ground: [
    { x: 19.3, y: 23, w: 27.5, h: 63.5 },
    { x: -30, y: 10, w: 30, h: 85 },
  ],
  rooms: [
    box('138', 0.4, 0, 7.8, 12.2, 'プラント'),
    box('139', 3.8, 3.4, 4.3, 3, 'プラント計器室'),
    box('140', 0.3, 12.3, 7.9, 4, '廃液処理室'),
    stairs(0.4, 16.2, 8, 4),
    box('141', 0.3, 24.4, 8, 4.2, '機器分析実習室'),
    box('142', 0.3, 28.7, 8, 8.1, '分析化学実験室・分析化学準備室'),
    box('143', 0.3, 36.8, 8.1, 4, '生物工学実験準備室'),
    box('144', 0.4, 40.8, 8.1, 7.8, '生物工学実験室'),
    box('culture', 0.4, 48.7, 8, 4, '培養室 1〜3'),
    wc(2.4, 56.7, 6, 4),
    box('club-rooms-1', 2.2, 61, 5, 7.2, '文化部部室 1〜3'),
    box('club-rooms-2', 2.2, 72.4, 3.1, 4.2, '文化部部室 4〜6'),
    box('153', 2.2, 76.6, 5.2, 10.2, '売店'),
    elevator(0.6, 88, 7, 4.5),
    box('136', 10.6, 0, 8.2, 8, '工作室・資材室'),
    box('135', 11.7, 8, 6.9, 4.4, '資材倉庫'),
    box('wi-store-1f', 10.5, 12.6, 6, 3.8),
    wc(11.1, 16.5, 5.3, 4.2),
    box('134', 10.6, 24.8, 8.2, 4, '資料閲覧室'),
    box('133', 10.6, 28.8, 8.2, 4, '微生物観察室・画像解析室'),
    box('132', 10.5, 32.9, 8.2, 4, '微生物実験準備室・菌株保存室'),
    box('131', 10.6, 37, 8.1, 7.8, '微生物実験室'),
    box('130', 10.7, 44.9, 8.1, 4, '薬品室'),
    stairs(10.7, 48.8, 8.2, 3.2),
    {
      ...feature('yard', '128', 10.2, 56.8, 8, 22.8, { ja: '食堂', en: 'Cafeteria' }),
      featured: true,
      byName: true,
    },
    hall('cafeteria-front', 10.2, 79.6, 8, 12.9, { ja: '食堂前', en: 'Outside the Cafeteria' }),
    stairs(27.5, 11.5, 2.2, 9),
    box('117', 30, 12.6, 16.6, 8, '数値制御工作機械実習室・CAM実習室'),
    box('118', 29.7, 23.3, 10.9, 6.9, '課題実習室'),
    box('116', 46.9, 0, 18.6, 12.6, '旋盤実習室・精密加工実習室・汎用機実習室'),
    box('ei-north-1f', 46.6, 12.6, 4.8, 8),
    wc(51.3, 16.5, 6, 4),
    box('115', 57.8, 12.7, 5.8, 4.2, '工具室（機械）'),
    stairs(57.4, 16.8, 8.2, 3.9),
    box('114', 57.7, 21.1, 8.2, 3.6, '材料倉庫'),
    box('113', 57.6, 24.9, 8.3, 4, 'ガス溶接実習室・アーク溶接実習室'),
    box('112', 57.5, 29.1, 8.3, 8.1, '手仕上げ実習室・板金加工実習室'),
    box('111', 57.4, 37.3, 8.3, 4, '溶接工具室・手仕上げ工具室'),
    box('110', 57.3, 41.3, 8.4, 8.2, '鋳造実習室'),
    box('darkroom', 59.2, 49.7, 4, 3.2, '写真暗室'),
    box('108', 57.9, 53.2, 7.8, 5.8, '職員更衣休養室（女）'),
    box('107', 57.7, 59, 7.8, 6, '職員更衣休養室（男）'),
    box('106', 57.2, 65.3, 5.9, 4, '技能員室'),
    box('105', 57.4, 71.8, 8.2, 5.2, 'カウンセリングルーム'),
    box('104', 57.3, 77, 8.2, 5.4, '保健室'),
    wc(57.2, 82.4, 6, 4),
    elevator(57.8, 88, 7.8, 4.5),
    box('119', 46.8, 28.9, 8.3, 8.5, '材料試験室'),
    box('119-prep', 47.6, 37.4, 7.5, 3.6, '材料準備室'),
    box('121', 46.6, 41, 8.3, 8.4, '流体力学自習室・流体準備室・原動機実習室'),
    stairs(46.8, 49.2, 8.2, 3.2),
    box('122', 46.1, 52.8, 8.7, 16.4, '会議室'),
    box('125', 41.3, 71.3, 6.5, 4.4, '応接室'),
    box('126', 41.1, 75.7, 6.5, 4.7, '校長室'),
    box('127', 40.9, 80.4, 6.6, 7.3, '事務室'),
    box('123', 49.7, 71.3, 5.1, 5, '書庫'),
    wc(49.4, 79.5, 5.1, 4),
    wc(49.3, 83.5, 5.1, 4.2),
    hall('office-front', 40.9, 87.7, 6.6, 4.8, { ja: '事務室前', en: 'Outside the Office' }, [
      named({ ja: '校庭・事務室前' }),
    ]),
    hall('reception', 25, 108, 10, 5, { ja: '受付', en: 'Reception' }, [
      named({ ja: '受付の後ろの柱前' }),
    ]),
    {
      ...box('103', 57.3, 92.6, 11.8, 19.6, undefined, [venue('avRoom')]),
      name: { ja: '視聴覚教室', en: 'AV Room' },
      byName: true,
    },
    stairs(46.7, 105, 2.5, 8),
    box('102', 46.8, 113.2, 6.5, 6.2, '記念室'),
    box('101', 56.8, 113, 9.9, 6.5, '多目的室'),
    stairs(67.5, 115.5, 2.5, 4),
    feature('yard', 'stage', 30.5, 32, 10, 5, { ja: 'ステージ', en: 'Stage' }, [
      venue('courtyard'),
      named({ ja: '中庭ステージ・鵜の森亭' }),
    ]),
    hall('eating-area', 28, 46.5, 9.8, 16, { ja: '食事場所', en: 'Eating Area' }),
    tent('A', 35, 81, 6, 6),
    tent('B', 35, 72.5, 6, 7),
    tent('C', 40, 62.5, 6, 7),
    tent('D', 40, 53.5, 6, 6.5),
    tent('E', 19.8, 72.5, 6, 7.5),
    tent('F', 19.8, 63.5, 6, 6.5),
    tent('G', 19.8, 46.5, 6, 6.5),
    tent('H', 19.8, 39.5, 6, 6.5),
    feature('room', 'kyudo', -26, 21, 10, 12, { ja: '弓道場', en: 'Kyudo Hall' }),
    feature('yard', 'schoolyard', -29, 44, 21, 50.5, { ja: '校庭', en: 'Schoolyard' }, [
      named({ ja: '校庭・事務室前' }),
    ]),
  ],
  omitted: [{ from: { x: -16, y: 27 }, to: { x: 0, y: 27 } }],
  noEntry: [
    { x: 10.3, y: 19.5 },
    { x: 10.3, y: 24.5 },
    { x: 10.3, y: 47.5 },
    { x: 57.5, y: 21.5 },
    { x: 57.5, y: 50.5 },
    { x: 48.5, y: 22 },
    { x: 24, y: 21.7 },
  ],
}

const floor2: MapFloor = {
  level: 2,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE, NORTH_STAIR, ...NORTH_DECK, ...ANNEX_2F],
  rooms: [
    feature('void', 'void', 0.5, 0, 7.9, 3.6),
    box('232', 0.4, 3.7, 8, 3.9, '生活環境制御ルーム'),
    box('233', 0.5, 7.7, 7.8, 8.4, '化学計測実習室・化学計測準備室'),
    stairs(0.4, 16.2, 8, 4),
    box('234', 2.4, 25.7, 6, 6.4, '西棟職員室'),
    box('235', 4.5, 32.2, 4.1, 3.9, 'NMR室'),
    box('236', 0.5, 36.2, 8, 3.9, '機器分析実習室'),
    box('237', 0.6, 40.2, 8, 7.8, '環境工学実習室・環境工学準備室', [
      named({ ja: '基礎分析実習室・環境工学実習室' }),
    ]),
    box('238', 2.6, 48.2, 5.9, 3.6, '生徒会室（全日制）'),
    box('239', 0.7, 52, 7.9, 6.1, '生徒更衣室（男）'),
    box('locker-day', 0.7, 58.3, 7.8, 22.1, 'ロッカースペース（全日制）'),
    elevator(0.6, 88, 7, 6),
    stairs(27.5, 8.2, 2.2, 9),
    box('231', 10.6, 0, 8.1, 7.8, '物理計測実習室・物理計測準備室'),
    box('230', 10.6, 8, 5.9, 3, '薬品庫'),
    box('wi-store-2f', 10.6, 11.1, 5.9, 4.9),
    wc(10.6, 16.2, 6, 4.1),
    box('229', 10.7, 28.1, 8.2, 8.2, '環境計測実習室'),
    box('228', 10.8, 36.4, 8.2, 3.8, '基礎分析準備室'),
    box('227', 10.8, 40.4, 8.2, 8.1, '基礎分析実習室', [
      named({ ja: '基礎分析実習室・環境工学実習室' }),
    ]),
    stairs(10.7, 48.8, 8.2, 3.2),
    box('226', 10.9, 52, 8.1, 6.1, '生徒更衣室（女）'),
    feature('void', 'void', 10.9, 61, 7.4, 11.2),
    box('wi-south-2f', 10.9, 72.5, 5.8, 3.5),
    wc(11.1, 76.3, 5.5, 4.3),
    box('208', 17.8, 81.3, 7.4, 4.1, '選択学習室 2'),
    box('207', 40.5, 81.9, 7.4, 4, '選択学習室 1'),
    box('206', 10.8, 88.4, 6.9, 6, '一般学習室 6'),
    box('205', 18.1, 88.4, 6.9, 6, '一般学習室 5'),
    box('204', 25.6, 88.4, 6.9, 6, '一般学習室 4'),
    box('203', 33.1, 88.4, 6.9, 6, '一般学習室 3'),
    box('202', 40.5, 88.4, 6.9, 6, '一般学習室 2'),
    box('201', 48.1, 88.4, 6.6, 6, '一般学習室 1'),
    elevator(57.8, 88.5, 7.8, 5.9),
    box('221', 47, 3.9, 8.1, 8.5, '電気機器室'),
    box('ei-store-2f', 49, 12.4, 6.1, 3.7),
    wc(49, 16.3, 6.1, 4.4),
    box('222', 46.7, 28.4, 8.2, 12.2, '自動制御実習室・ロボット・FA実習室'),
    box('223', 46.7, 40.8, 8.2, 3.8, '計測準備室'),
    box('224', 46.7, 44.8, 8.2, 4.1, '計測実習室'),
    stairs(46.8, 49.2, 8.2, 3.2),
    box('locker-evening', 49.2, 52.6, 5.6, 9, 'ロッカースペース（定時制）'),
    hall('unomori-tei', 49, 62.5, 6.4, 9.5, { ja: '鵜の森亭', en: 'Unomori-tei' }, [
      named({ ja: '中庭ステージ・鵜の森亭' }),
    ]),
    box('225', 48.5, 72.5, 5.9, 5.5, '生徒会室（定時制）'),
    wc(50.9, 78.5, 4, 4),
    box('220', 57.5, 4, 8.1, 8.3, '高圧実習室・受電設備実習室・模擬送電設備実習室'),
    box('219', 57.5, 12.6, 8.1, 3.9, '高圧実習準備室'),
    stairs(57.4, 16.8, 8.2, 3.9),
    box('218', 57.6, 24.5, 8.1, 4, '工学系課題研究室'),
    box('217', 57.5, 28.7, 8.1, 7.9, 'CAD室 2'),
    box('216', 57.5, 36.9, 7.4, 7.8, 'CAD室 1'),
    box('215', 57.5, 44.9, 6.8, 4.1, '製図教材室'),
    box('214', 57.5, 49.3, 6.4, 7.6, '製図室'),
    box('213', 57.5, 57.1, 6.1, 11.9, '定時制職員室'),
    box('212', 57.9, 69.3, 5.4, 2.9, '小会議室'),
    box('211', 57.9, 72.4, 5.6, 4.6, '職員室 1'),
    feature('void', 'void', 57.7, 96, 12.8, 19.3),
    stairs(46.7, 105, 2.5, 8),
    // The library wraps around the store room
    {
      ...box('209', 46.6, 115.5, 14.2, 7.3),
      name: { ja: '図書室', en: 'Library' },
      byName: true,
      parts: [{ x: 60.8, y: 118.8, w: 6.5, h: 4 }],
    },
    box('storage', 60.8, 115.5, 5, 2.8, '倉庫'),
  ],
  noEntry: [
    { x: 62.5, y: 21.5 },
    { x: 57.3, y: 15.8 },
    { x: 57.3, y: 27.5 },
    { x: 57.3, y: 80 },
    { x: 10, y: 22.5 },
    { x: 4.5, y: 21.5 },
    { x: 14, y: 52.5 },
  ],
}

const floor3: MapFloor = {
  level: 3,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE, ...ANNEX_3F],
  rooms: [
    box('331', 2.3, 3.3, 6.1, 4, '地球科学準備室'),
    box('332', 0.4, 7.4, 8, 8.7, '地球科学実験室'),
    stairs(0.4, 16.2, 8, 4),
    box('333', 0.4, 32.4, 8.2, 7.9, '宇宙工学実習室・宇宙工学準備室'),
    box('334', 0.6, 40.4, 8, 7.8, '化学基礎実験室'),
    box('335', 2.5, 48.4, 6.1, 3.5, '化学基礎準備室'),
    box('336', 0.5, 52.1, 8.2, 7.9, '生命基礎実験室'),
    box('337', 2.4, 60.3, 6.2, 3.9, '生命基礎準備室'),
    box('338', 0.5, 67.8, 8, 8, '美術室'),
    box('338-prep', 0.4, 76, 8, 3.9, '美術準備室'),
    elevator(0.6, 88, 7, 6),
    box('330', 10.5, 3.4, 8.1, 8.8, '宇宙通信実習室'),
    box('wi-store-3f', 10.6, 12.2, 6.1, 3.9),
    wc(10.5, 16.2, 6.1, 4.3),
    box('329', 10.6, 28.3, 8.2, 8.3, '力学実験実習室'),
    box('328', 10.8, 36.7, 8.1, 3.9, '力学実習準備室'),
    box('327', 10.7, 40.6, 8.3, 8.1, '物理基礎実験室'),
    stairs(10.7, 48.8, 8.2, 3.2),
    box('326', 10.7, 52.2, 7, 8.1, '社会科学習室'),
    box('325', 11.7, 60.4, 5.1, 3.9, '社会科準備室'),
    box('wi-south-3f', 10.7, 72.2, 6, 3.5),
    wc(10.7, 75.8, 6, 4.3),
    box('308', 17.8, 81.3, 7.4, 4.1, '選択学習室 4'),
    box('307', 40.5, 81.9, 7.4, 4, '選択学習室 3'),
    box('306', 10.8, 88.4, 6.9, 6, '一般学習室 12'),
    box('305', 18.1, 88.4, 6.9, 6, '一般学習室 11'),
    box('304', 25.6, 88.4, 6.9, 6, '一般学習室 10'),
    box('303', 33.1, 88.4, 6.9, 6, '一般学習室 9'),
    box('302', 40.5, 88.4, 6.9, 6, '一般学習室 8'),
    box('301', 48.1, 88.4, 6.6, 6, '一般学習室 7'),
    elevator(57.8, 88.5, 7.8, 5.9),
    box('319', 46.8, 3.9, 8, 8.7, '電気工作室'),
    box('ei-store-3f', 48.8, 12.6, 6.1, 3.9),
    wc(48.7, 16.6, 6.2, 4.5),
    box('320', 46.8, 28.8, 8.1, 8.3, '電気工事室'),
    box('321', 46.7, 37.2, 8.1, 3.9, '電気工事用資材室'),
    box('322', 46.8, 41.2, 8, 8.1, '電子工作室'),
    stairs(46.8, 49.2, 8.2, 3.2),
    box('323', 49.1, 52.8, 5.8, 4.1, '印刷室'),
    box('324', 49.2, 57.1, 5.8, 3.9, '放送室'),
    feature('void', 'void', 49.4, 65.2, 5.7, 7.4),
    box('ei-south-3f', 48.2, 72.8, 6.9, 3.5),
    wc(48.3, 76.5, 7, 4.4),
    hall('east-lounge-3f', 47.5, 82, 9.8, 5.5, { ja: 'ラウンジ', en: 'Lounge' }, [
      named({ ja: '東棟3階ラウンジ' }),
    ]),
    feature('void', 'void', 57.3, 4.3, 8.1, 8.3),
    box('eo-store-3f', 57.2, 12.8, 8.2, 4.1),
    stairs(57.4, 16.8, 8.2, 3.9),
    box('318', 57.2, 26.7, 6, 6, '科学系課題研究室'),
    box('317', 57.3, 32.9, 8.1, 8.3, 'プリント基板加工室'),
    box('316', 57.4, 41.3, 8.1, 8.1, '電気計測室'),
    box('315', 57.3, 49.5, 5.9, 3.5, '校正室'),
    box('career-1', 57.4, 53.2, 8.2, 3.9, '進路相談室 1'),
    box('314', 57.4, 57.3, 8.1, 6, 'ガイダンスルーム'),
    box('career-2', 57.5, 63.4, 8.1, 3.8, '進路相談室 2'),
    box('313', 57.5, 67.3, 8.2, 5.5, '情報管理室'),
    box('312', 57.7, 73, 8.1, 7.9, '職員室 2'),
    box('311', 58, 94.5, 8.2, 9.3, '情報基礎コンピューター室'),
    box('310', 58.1, 104, 8.2, 8.5, 'CALL学習室'),
    box('309', 58.1, 112.8, 8.2, 3.4, '国際交流室'),
    stairs(67.5, 115.5, 2.5, 4),
  ],
  noEntry: [
    { x: 57.3, y: 79.5 },
    { x: 57.5, y: 95.5 },
    { x: 10.3, y: 63 },
  ],
}

const floor4: MapFloor = {
  level: 4,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE, ANNEX_4F],
  rooms: [
    box('427', 0.4, 36.5, 8, 11.8, '調理室'),
    box('428', 0.3, 48.4, 8.1, 3.6, '家庭科準備室'),
    box('429', 0.3, 52.1, 7.9, 8.1, '被服室'),
    box('430', 0.4, 68.3, 7.9, 8, '音楽室'),
    box('431', 0.5, 76.6, 7.1, 3.8, '音楽準備室'),
    elevator(0.6, 88, 7, 6),
    box('426', 10.7, 40.5, 8.1, 3.7, '作法室'),
    box('425', 10.7, 44.3, 8.1, 4.3, '気象大気観測室'),
    stairs(10.7, 48.8, 8.2, 3.2),
    box('424', 10.7, 52.1, 6.8, 8, '書道室'),
    box('wi-south-4f', 11.1, 72.8, 4.8, 3.2),
    wc(11, 76.5, 5.2, 4.1),
    box('408', 17.8, 81.3, 7.4, 4.1, '選択学習室 6'),
    box('407', 40.5, 81.9, 7.4, 4, '選択学習室 5'),
    box('406', 10.8, 88.4, 6.9, 6, '一般学習室 18'),
    box('405', 18.1, 88.4, 6.9, 6, '一般学習室 17'),
    box('404', 25.6, 88.4, 6.9, 6, '一般学習室 16'),
    box('403', 33.1, 88.4, 6.9, 6, '一般学習室 15'),
    box('402', 40.5, 88.4, 6.9, 6, '一般学習室 14'),
    box('401', 48.1, 88.4, 6.6, 6, '一般学習室 13'),
    elevator(57.8, 88.5, 7.8, 5.9),
    wc(49.1, 15.5, 5.7, 5.2),
    box('418', 46.7, 33, 8, 3.8, '電子回路実習室'),
    box('419', 46.8, 36.9, 8, 3.6, '論理回路実習室'),
    box('420', 46.8, 40.5, 8, 4.2, '情報システム工学第1実験室'),
    box('421', 46.7, 44.7, 8, 4.2, '情報システム工学第2実験室'),
    stairs(46.8, 49.2, 8.2, 3.2),
    box('422', 46.8, 52.4, 8, 8.4, '情報システム工学第3実験室'),
    box('423', 46.9, 60.9, 7.3, 3.7, '自習室'),
    box('ei-south-4f', 48.3, 76.8, 3, 8.7),
    wc(51.3, 77.5, 4.1, 4.5),
    box('415', 57.9, 5.5, 7.7, 11, '電波暗室講義室'),
    stairs(57.4, 16.8, 8.2, 3.9),
    box('414', 57.4, 30.6, 6.1, 6, '情報系課題研究室'),
    box('413', 57.3, 36.9, 8.2, 5, 'プログラム実習室'),
    box('eo-mid-4f', 57.4, 42.9, 8.2, 2.7),
    box('412', 57.4, 45.9, 8.2, 9.9, 'ネットワーク通信実習室'),
    box('411', 57.4, 56, 8.1, 8.8, 'マルチメディア実習室'),
    box('410', 57.6, 65.1, 6.8, 4, '外国語学習室'),
    box('409', 57.8, 70, 8, 7.8, '職員室 3'),
    box('eo-south-4f', 58.1, 78.1, 7.7, 2.8),
  ],
  noEntry: [
    { x: 57.3, y: 79.5 },
    { x: 14, y: 52.5 },
  ],
}

export const campusFloors: MapFloor[] = [floor1, floor2, floor3, floor4]

export const FLOOR_LEVELS: FloorLevel[] = campusFloors.map((floor) => floor.level)

export function isFloorLevel(value: unknown): value is FloorLevel {
  return (FLOOR_LEVELS as unknown[]).includes(value)
}
