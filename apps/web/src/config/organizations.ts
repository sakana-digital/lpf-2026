export type Grade = 1 | 2 | 3
export type ClassNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Floor = 1 | 2 | 3 | 4

export interface VenueLocation {
  floor: Floor
  room: string
}

interface OrganizationBase {
  id: string
  name: string
  nameEn?: string
  location?: VenueLocation
  image?: string
}

export interface ClassOrganization extends OrganizationBase {
  kind: 'class'
  grade: Grade
  classNo: ClassNumber
}

export interface ClubOrganization extends OrganizationBase {
  kind: 'club'
  group: string
}

export interface CommitteeOrganization extends OrganizationBase {
  kind: 'committee'
}

export type Organization = ClassOrganization | ClubOrganization | CommitteeOrganization

export const grades = [1, 2, 3] as const
export const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8] as const

function cls(grade: Grade, classNo: ClassNumber, name = '', nameEn?: string): ClassOrganization {
  // 1年が最上階 (4F) で，学年が上がるほど下の階になる
  const floor = (5 - grade) as Floor
  return {
    kind: 'class',
    id: `c${grade}-${classNo}`,
    grade,
    classNo,
    name,
    nameEn,
    location: { floor, room: `r${floor}0${classNo}` },
  }
}

function club(no: number, group = '', name = '', nameEn?: string): ClubOrganization {
  return { kind: 'club', id: `club-${no}`, group, name, nameEn }
}

function committee(no: number, name = '', nameEn?: string): CommitteeOrganization {
  return { kind: 'committee', id: `com-${no}`, name, nameEn }
}

export const organizations: Organization[] = [
  cls(1, 1),
  cls(1, 2),
  cls(1, 3),
  cls(1, 4),
  cls(1, 5),
  cls(1, 6),
  cls(1, 7),
  cls(1, 8),
  cls(2, 1),
  cls(2, 2),
  cls(2, 3),
  cls(2, 4),
  cls(2, 5),
  cls(2, 6),
  cls(2, 7),
  cls(2, 8),
  cls(3, 1),
  cls(3, 2),
  cls(3, 3),
  cls(3, 4),
  cls(3, 5),
  cls(3, 6),
  cls(3, 7),
  cls(3, 8),
  club(1),
  club(2),
  club(3),
  club(4),
  committee(1),
  committee(2),
  committee(3),
]

export function getOrganization(id: string): Organization | undefined {
  return organizations.find((org) => org.id === id)
}

export function getOrganizationByRoom(room: string): Organization | undefined {
  return organizations.find((org) => org.location?.room === room)
}

export function organizationName(org: Organization, locale: string): string {
  return (locale === 'en' && org.nameEn) || org.name
}

/**
 * 一覧やパネルの見出しに出す短いラベル。
 * クラスは学年-組、それ以外は団体名を使い、名前未定なら空文字を返す。
 */
export function organizationLabel(
  org: Organization,
  locale: string,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  return org.kind === 'class'
    ? t('explore.events.classLabel', { grade: org.grade, classNo: org.classNo })
    : organizationName(org, locale)
}
