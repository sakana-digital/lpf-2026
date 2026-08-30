import {
  classNumbers,
  classOrgId,
  clubNumbers,
  clubOrgId,
  committeeNumbers,
  committeeOrgId,
  grades,
} from '@shared/organizations'
import type { ClassNumber, Grade } from '@shared/organizations'

export { classNumbers, grades }
export type { ClassNumber, Grade }

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

interface OrganizationProfile {
  name?: string
  nameEn?: string
  group?: string
  image?: string
}

// Organization ids live in shared/; only what the site displays belongs here.
const profiles: Record<string, OrganizationProfile> = {}

function profileOf(id: string): OrganizationProfile {
  return profiles[id] ?? {}
}

function cls(grade: Grade, classNo: ClassNumber): ClassOrganization {
  // 1年が最上階 (4F) で，学年が上がるほど下の階になる
  const floor = (5 - grade) as Floor
  const id = classOrgId(grade, classNo)
  const { name = '', nameEn, image } = profileOf(id)
  return {
    kind: 'class',
    id,
    grade,
    classNo,
    name,
    nameEn,
    image,
    location: { floor, room: `r${floor}0${classNo}` },
  }
}

function club(no: number): ClubOrganization {
  const id = clubOrgId(no)
  const { name = '', nameEn, group = '', image } = profileOf(id)
  return { kind: 'club', id, group, name, nameEn, image }
}

function committee(no: number): CommitteeOrganization {
  const id = committeeOrgId(no)
  const { name = '', nameEn, image } = profileOf(id)
  return { kind: 'committee', id, name, nameEn, image }
}

export const organizations: Organization[] = [
  ...grades.flatMap((grade) => classNumbers.map((classNo) => cls(grade, classNo))),
  ...clubNumbers.map((no) => club(no)),
  ...committeeNumbers.map((no) => committee(no)),
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
