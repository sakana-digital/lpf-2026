import type { LocalizedText } from '@shared/locale'
import { named, room as placeInRoom, tent as placeInTent, venue } from '@shared/organizations'
import type { OrgPlace, TentLetter } from '@shared/organizations'
import type { MapIconName } from '@/lib/mapIcons'

/**
 * The school seen from above, north up, in metres from the north-west corner
 * of the west wing. Everything is an axis-aligned box read off the evacuation
 * plans, so a room is four numbers; the isometric projection happens at
 * render time. Room ids are the numbers printed on the plans, which is what
 * OrgPlace rooms and the festival programme use.
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
  icon?: MapIconName
}

export type MapRoomKind = 'room' | 'hall' | 'yard' | 'stairs' | 'wc' | 'elevator' | 'void' | 'tent'

export const ROOM_KINDS: Record<MapRoomKind, RoomKindSpec> = {
  room: { height: 3, linkable: true, surface: 'roof' },
  hall: { height: 0, linkable: true, surface: 'flat' },
  yard: { height: 0, linkable: true, surface: 'flat' },
  stairs: { height: 0, linkable: false, surface: 'outline', icon: 'stairs' },
  wc: { height: 0, linkable: false, surface: 'outline', icon: 'wc' },
  elevator: { height: 0, linkable: false, surface: 'outline', icon: 'elevator' },
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
  /**
   * Places the programme puts here under another name: the festival's zone
   * codes, the timetable venues, spelled-out spots. A room answers to its own
   * number and name without being told.
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

// Each wing is two rows of rooms along a corridor: outer rows face the street, inner rows the courtyard
type Column = Pick<MapBox, 'x' | 'w'>
const WO: Column = { x: 0, w: 9 }
const WI: Column = { x: 11, w: 9 }
const WI4: Column = { x: 11, w: 6 }
const EI: Column = { x: 46, w: 9 }
const EO: Column = { x: 57, w: 9 }

const WING_W: MapBox = { x: 0, y: 0, w: 22, h: 95 }
const WING_E: MapBox = { x: 44, y: 0, w: 22, h: 95 }
const SOUTH_BAR: MapBox = { x: 0, y: 83, w: 66, h: 12 }
const BRIDGE: MapBox = { x: 22, y: 26, w: 22, h: 2 }
const NORTH_STAIR: MapBox = { x: 28, y: 11, w: 3.5, h: 15 }
const ANNEX: MapBox = { x: 44, y: 95, w: 26, h: 22 }

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

function room(id: string, col: Column, y: number, h: number, ja?: string, places?: OrgPlace[]) {
  return box(id, col.x, y, col.w, h, ja, places)
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

function elevators(): MapRoom[] {
  return [
    feature('elevator', 'elevator', 0, 89, 7, 6),
    feature('elevator', 'elevator', 59, 89, 7, 6),
  ]
}

/** 一般学習室 1–6 sit on 2F, 7–12 on 3F, 13–18 on 4F, numbered from the east end. */
function classroomRow(level: FloorLevel): MapRoom[] {
  return [6, 5, 4, 3, 2, 1].map((n, i) =>
    box(`${level}0${n}`, 10 + i * 8, 89, 8, 6, `一般学習室 ${(level - 2) * 6 + n}`),
  )
}

function tent(letter: TentLetter, x: number, y: number, w: number, h: number): MapRoom {
  const id = `tent-${letter}`
  return { ...feature('tent', id, x, y, w, h, undefined, [placeInTent(letter)]), label: letter }
}

/** Where the programme's zone codes, which its listings file under `room`, point */
function zone(code: string): OrgPlace {
  return placeInRoom(code)
}

const floor1: MapFloor = {
  level: 1,
  slab: [
    { x: 0, y: 0, w: 22, h: 89 },
    { x: 44, y: 0, w: 22, h: 89 },
    { x: 0, y: 89, w: 20, h: 6 },
    { x: 40, y: 89, w: 26, h: 6 },
    { x: 28, y: 11, w: 22, h: 24 },
    { x: 20, y: 24, w: 26, h: 2.5 },
    ANNEX,
  ],
  ground: [
    { x: 22, y: 27, w: 22, h: 62 },
    { x: -30, y: 10, w: 30, h: 82 },
  ],
  rooms: [
    box('138', 0, 0, 9, 15, 'プラント'),
    box('139', 3.5, 1.5, 5, 5, 'プラント計器室'),
    room('140', WO, 15, 4.5, '廃液処理室'),
    stairs(2, 19.5, 7, 5),
    room('141', WO, 28, 5.5, '機器分析実習室'),
    room('142', WO, 34.5, 6, '分析化学実験室・分析化学準備室'),
    room('143', WO, 41.5, 6, '生物工学実験準備室'),
    room('144', WO, 48, 5.5, '生物工学実験室'),
    box('culture', 3, 54, 6, 3, '培養室 1〜3'),
    wc(0, 60.5, 5, 4.5),
    box('club-rooms-1', 0, 68, 4, 5.5, '文化部部室 1〜3'),
    box('club-rooms-2', 0, 78.5, 4, 5, '文化部部室 4〜6'),
    box('153', 0, 84.5, 4, 4.5, '売店'),
    hall('entrance-hall', 7, 89, 13, 6, { ja: 'エントランスホール', en: 'Entrance Hall' }),

    room('136', WI, 0, 9, '工作室・資材室'),
    room('135', WI, 10, 5, '資材倉庫'),
    wc(11, 19.5, 5, 4.5),
    room('134', WI, 28, 4, '資料閲覧室'),
    room('133', WI, 32.5, 4, '微生物観察室・画像解析室'),
    room('132', WI, 37.5, 4, '微生物実験準備室・菌株保存室'),
    room('131', WI, 42, 6, '微生物実験室'),
    room('130', WI, 49, 4.5, '薬品室'),
    stairs(11, 54, 6, 4),
    { ...room('128', WI, 63, 20.5), name: { ja: '食堂', en: 'Cafeteria' }, featured: true },
    hall('cafeteria-front', 11, 83.5, 9, 5.5, { ja: '食堂前', en: 'Outside the Cafeteria' }),
    stairs(20.5, 64, 3.5, 5),

    stairs(28, 11, 3.5, 12),
    box('117', 30, 14, 20, 10, '数値制御工作機械実習室・CAM実習室'),
    box('118', 30, 26.5, 10, 8, '課題実習室'),

    box('116', 46, 0, 20, 14, '旋盤実習室・精密加工実習室・汎用機実習室', [zone('10C')]),
    box('115', 55, 15, 8, 4, '工具室（機械）'),
    wc(50, 20, 5, 4),
    stairs(60, 20, 5, 4.5),
    room('119', EI, 33, 8.5, '材料試験室'),
    box('119-prep', 47, 42, 8, 3.5, '材料準備室'),
    room('121', EI, 46, 7.5, '流体力学自習室・流体準備室・原動機実習室'),
    stairs(48.5, 54, 5, 4),
    box('122', 47, 58, 7, 15.5, '会議室'),
    box('125', 41, 74.5, 6, 4, '応接室'),
    box('126', 41, 79, 6, 4, '校長室'),
    box('123', 49, 76, 5.5, 4, '書庫'),
    wc(49.5, 82, 4, 3.5),
    wc(49.5, 85.5, 4, 3.5),
    box('127', 38, 84, 7, 5, '事務室'),
    hall('office-front', 38, 89, 7, 6, { ja: '事務室前', en: 'Outside the Office' }, [
      named({ ja: '校庭・10E' }),
    ]),
    hall('genkan-hall', 45, 89, 10, 6, { ja: '玄関ホール', en: 'Main Entrance Hall' }),
    hall('reception', 25, 112, 10, 5, { ja: '受付', en: 'Reception' }, [
      named({ ja: '受付の後ろの柱前' }),
    ]),

    room('114', EO, 26, 3, '材料倉庫'),
    room('113', EO, 29.5, 4.5, 'ガス溶接実習室・アーク溶接実習室'),
    room('112', EO, 34, 7, '手仕上げ実習室・板金加工実習室'),
    room('111', EO, 41.5, 5, '溶接工具室・手仕上げ工具室'),
    room('110', EO, 47, 6.5, '鋳造実習室'),
    box('darkroom', 58.5, 54, 5, 3.5, '写真暗室'),
    box('108', 57, 58, 8, 5, '職員更衣休養室（女）'),
    box('107', 57, 63.5, 8, 5.5, '職員更衣休養室（男）'),
    box('106', 57, 69.5, 5, 4, '技能員室'),
    box('105', 58, 75.5, 6, 4.5, 'カウンセリングルーム'),
    box('104', 58, 80.5, 6, 4.5, '保健室'),
    wc(58, 85.5, 4, 3.5),
    ...elevators(),

    box('103', 56, 97, 14, 16, '視聴覚教室', [venue('avRoom')]),
    box('102', 47.5, 113.5, 7, 3.5, '記念室'),
    box('101', 56.5, 113, 9.5, 4, '多目的室'),
    stairs(66, 113, 4, 4),

    // Courtyard layout from the programme's floor map: the stage along the bridge, the
    // 3rd-year tents in two rows, the east row numbered from the entrance end
    // The stage lines up with 118 behind it and stops short of tent D
    feature('yard', 'stage', 30, 36, 10, 5, { ja: 'ステージ', en: 'Stage' }, [
      venue('courtyard'),
      named({ ja: '中庭ステージ・20B（鵜の森亭）' }),
    ]),
    hall('eating-area', 29, 50, 6, 16, { ja: '食事場所', en: 'Eating Area' }),
    tent('A', 35, 76, 6, 7),
    tent('B', 40, 66, 6, 7),
    tent('C', 40, 57, 6, 6.5),
    tent('D', 40, 45, 6, 7),
    tent('E', 22.5, 76, 6, 7.5),
    tent('F', 22.5, 67, 6, 6.5),
    tent('G', 22.5, 50, 6, 6.5),
    tent('H', 22.5, 43, 6, 6.5),

    // The kyudo hall stands well beyond the drawn ground; the dashed line from
    // the corridor beside the north stairs says so
    feature('room', 'kyudo', -26, 21, 10, 12, { ja: '弓道場', en: 'Kyudo Hall' }),
    feature('yard', 'schoolyard', -22, 44, 14, 26, { ja: '校庭', en: 'Schoolyard' }, [
      named({ ja: '校庭・10E' }),
    ]),
  ],
  omitted: [{ from: { x: -16, y: 27 }, to: { x: 0, y: 27 } }],
  noEntry: [
    { x: 10, y: 21 },
    { x: 10, y: 30 },
    { x: 10, y: 51 },
    { x: 56, y: 23 },
    { x: 56, y: 55 },
    { x: 48, y: 25 },
    { x: 26, y: 25 },
  ],
}

const floor2: MapFloor = {
  level: 2,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE, NORTH_STAIR, ANNEX],
  rooms: [
    feature('void', 'void', 0, 0, 9, 4.5),
    room('232', WO, 5, 5, '生活環境制御ルーム'),
    room('233', WO, 10.5, 9, '化学計測実習室・化学計測準備室'),
    stairs(2, 19.5, 7, 5),
    box('234', 0, 31, 8, 5, '西棟職員室'),
    box('235', 4, 37.5, 5, 4.5, 'NMR室'),
    room('236', WO, 42.5, 5, '機器分析実習室'),
    room('237', WO, 48, 6, '環境工学実習室・環境工学準備室', [zone('20C')]),
    box('238', 2.5, 54.5, 5.5, 4, '生徒会室（全日制）'),
    box('239', 1, 59.5, 7, 4, '生徒更衣室（男）'),
    box('locker-day', 0, 67, 11, 15.5, 'ロッカースペース（全日制）'),

    room('231', WI, 0, 10, '物理計測実習室・物理計測準備室'),
    room('230', WI, 11, 5, '薬品庫'),
    wc(11, 20, 5, 4),
    room('229', WI, 33, 7.5, '環境計測実習室', [zone('20D')]),
    room('228', WI, 41, 4.5, '基礎分析準備室'),
    room('227', WI, 46.5, 7, '基礎分析実習室', [zone('20C')]),
    stairs(11, 54, 6, 4),
    room('226', WI, 58.5, 5, '生徒更衣室（女）'),
    feature('void', 'void', 11, 66, 9, 11),
    wc(14, 79, 4, 4),
    stairs(20.5, 64, 3.5, 5),
    stairs(28, 14, 3.5, 7),

    room('221', EI, 5, 10.5, '電気機器室'),
    wc(51, 20, 4, 4),
    room('222', EI, 33, 12.5, '自動制御実習室・ロボット・FA実習室'),
    room('223', EI, 46, 4, '計測準備室'),
    room('224', EI, 51, 4, '計測実習室'),
    stairs(48, 55, 6, 4),
    room('locker-evening', EI, 60, 9.5, 'ロッカースペース（定時制）'),
    hall('unomori-tei', 46, 70, 9, 6, { ja: '鵜の森亭', en: 'Unomori-tei' }, [
      named({ ja: '中庭ステージ・20B（鵜の森亭）' }),
    ]),
    box('225', 49, 76, 6, 4.5, '生徒会室（定時制）'),
    wc(49, 80.5, 4, 3),

    room('220', EO, 5, 10.5, '高圧実習室・受電設備実習室・模擬送電設備実習室'),
    room('219', EO, 16, 3.5, '高圧実習準備室'),
    stairs(60, 20, 5, 4.5),
    box('218', 59, 29, 7, 4, '工学系課題研究室'),
    room('217', EO, 33.5, 10, 'CAD室 2'),
    room('216', EO, 44, 5.5, 'CAD室 1'),
    room('215', EO, 50.5, 4, '製図教材室'),
    room('214', EO, 55, 6, '製図室'),
    room('213', EO, 62, 9.5, '定時制職員室'),
    room('212', EO, 72, 4.5, '小会議室'),
    room('211', EO, 77.5, 5.5, '職員室 1'),

    box('208', 18, 83.5, 7, 4, '選択学習室 2'),
    box('207', 41, 83.5, 7.5, 4, '選択学習室 1'),
    ...classroomRow(2),
    ...elevators(),

    feature('void', 'void', 56, 96, 14, 14),
    box('209', 47, 111, 11, 6, '図書室'),
    box('storage', 58, 111, 6, 3, '倉庫'),
    stairs(66, 113, 4, 4),
  ],
  noEntry: [
    { x: 62.5, y: 22 },
    { x: 56, y: 18 },
    { x: 56, y: 31 },
    { x: 56, y: 84 },
    { x: 10, y: 22 },
    { x: 5.5, y: 22 },
    { x: 14, y: 56 },
  ],
}

const floor3: MapFloor = {
  level: 3,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE, ANNEX],
  rooms: [
    box('331', 1, 5, 7, 4.5, '地球科学準備室'),
    room('332', WO, 10, 8.5, '地球科学実験室'),
    stairs(2, 19.5, 7, 5),
    room('333', WO, 35, 10.5, '宇宙工学実習室・宇宙工学準備室'),
    room('334', WO, 46, 8, '化学基礎実験室'),
    box('335', 3, 54.5, 6, 4.5, '化学基礎準備室'),
    room('336', WO, 59.5, 4.5, '生命基礎実験室'),
    box('337', 3, 64.5, 6, 4.5, '生命基礎準備室'),
    room('338', WO, 72.5, 6.5, '美術室', [zone('30A')]),
    room('338-prep', WO, 79.5, 3.5, '美術準備室'),

    room('330', WI, 5, 11.5, '宇宙通信実習室'),
    wc(11, 19.5, 5, 4.5),
    room('329', WI, 33, 9, '力学実験実習室'),
    room('328', WI, 42.5, 4.5, '力学実習準備室'),
    room('327', WI, 47.5, 7, '物理基礎実験室'),
    stairs(11, 55, 6, 4),
    room('326', WI, 60, 4.5, '社会科学習室'),
    box('325', 11, 65, 5, 4, '社会科準備室'),
    wc(14, 79, 4, 4),

    room('319', EI, 6.5, 12, '電気工作室'),
    wc(51, 19.5, 4, 4.5),
    room('320', EI, 33, 9, '電気工事室'),
    room('321', EI, 42, 6, '電気工事用資材室'),
    room('322', EI, 48.5, 6.5, '電子工作室'),
    stairs(48, 55, 6, 4),
    room('323', EI, 60, 4, '印刷室'),
    room('324', EI, 64, 4, '放送室'),
    feature('void', 'void', 46, 70, 9, 7),
    wc(49, 79, 4, 4),
    hall('east-lounge-3f', 49, 83, 8, 5.5, { ja: 'ラウンジ', en: 'Lounge' }, [
      named({ ja: '東棟3階ラウンジ' }),
    ]),

    feature('void', 'void', 57, 6.5, 9, 12),
    stairs(60, 20, 5, 4.5),
    box('318', 59, 29, 7, 7.5, '科学系課題研究室'),
    room('317', EO, 37, 11.5, 'プリント基板加工室'),
    room('316', EO, 49, 7, '電気計測室'),
    box('315', 59.5, 56.5, 4, 2, '校正室'),
    room('career-1', EO, 59, 3.5, '進路相談室 1'),
    room('314', EO, 63, 4, 'ガイダンスルーム'),
    room('career-2', EO, 67.5, 2.5, '進路相談室 2'),
    room('313', EO, 70.5, 5, '情報管理室'),
    room('312', EO, 76, 6, '職員室 2'),

    box('308', 18, 83.5, 7, 4, '選択学習室 4'),
    box('307', 41, 83.5, 7.5, 4, '選択学習室 3'),
    ...classroomRow(3),
    ...elevators(),

    box('311', 56, 97, 9, 8, '情報基礎コンピューター室'),
    box('310', 56, 105, 9, 7, 'CALL学習室'),
    box('309', 56, 112, 9, 4.5, '国際交流室'),
    stairs(66, 113, 4, 4),
  ],
  noEntry: [
    { x: 56, y: 81.5 },
    { x: 53, y: 96 },
    { x: 10, y: 67 },
  ],
}

const floor4: MapFloor = {
  level: 4,
  slab: [WING_W, WING_E, SOUTH_BAR, BRIDGE],
  rooms: [
    room('427', WO, 42.5, 11, '調理室'),
    room('428', WO, 54, 4, '家庭科準備室'),
    room('429', WO, 58.5, 6, '被服室'),
    room('430', WO, 72.5, 6, '音楽室'),
    room('431', WO, 78.5, 4, '音楽準備室'),

    room('426', WI4, 45, 5, '作法室'),
    room('425', WI4, 50, 4.5, '気象大気観測室'),
    stairs(11, 55, 6, 4),
    room('424', WI4, 59.5, 6, '書道室'),
    wc(13, 79, 4, 4),

    wc(49, 19.5, 6, 4.5),
    room('418', EI, 33.5, 4, '電子回路実習室'),
    room('419', EI, 38, 4, '論理回路実習室'),
    room('420', EI, 42.5, 6, '情報システム工学第1実験室'),
    room('421', EI, 49, 6, '情報システム工学第2実験室'),
    stairs(48, 55, 6, 4),
    room('422', EI, 59.5, 5.5, '情報システム工学第3実験室'),
    room('423', EI, 65.5, 4, '自習室'),
    wc(49, 79.5, 4, 3.5),

    box('415', 58, 9.5, 8, 10, '電波暗室講義室'),
    stairs(60, 20, 5, 4.5),
    box('414', 59, 31.5, 7, 9.5, '情報系課題研究室'),
    room('413', EO, 41.5, 9.5, 'プログラム実習室'),
    room('412', EO, 52, 9.5, 'ネットワーク通信実習室'),
    room('411', EO, 62, 7.5, 'マルチメディア実習室'),
    room('410', EO, 70, 6.5, '外国語学習室'),
    room('409', EO, 77, 6, '職員室 3'),

    box('408', 18, 83.5, 7, 4, '選択学習室 6'),
    box('407', 41, 83.5, 7.5, 4, '選択学習室 5'),
    ...classroomRow(4),
    ...elevators(),
  ],
  noEntry: [
    { x: 56, y: 83.5 },
    { x: 14, y: 57 },
  ],
}

export const campusFloors: MapFloor[] = [floor1, floor2, floor3, floor4]

export const FLOOR_LEVELS: FloorLevel[] = campusFloors.map((floor) => floor.level)

export function isFloorLevel(value: unknown): value is FloorLevel {
  return (FLOOR_LEVELS as unknown[]).includes(value)
}
