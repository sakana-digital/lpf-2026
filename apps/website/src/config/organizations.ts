import {
  classNumbers,
  classOrgId,
  clubNumbers,
  clubOrgId,
  committeeNumbers,
  committeeOrgId,
  grades,
  organizationNames,
} from '@shared/organizations'
import type { ClassNumber, Grade } from '@shared/organizations'
import { localized } from '@shared/locale'
import type { LocalizedText } from '@shared/locale'

export { classNumbers, grades }
export type { ClassNumber, Grade }

export type Floor = 1 | 2 | 3 | 4

export interface VenueLocation {
  floor: Floor
  room: string
}

interface OrganizationBase {
  id: string
  /** Left unset for groups whose name is not decided yet. */
  name?: LocalizedText
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
  group?: string
  image?: string
}

// Ids and names live in shared/; only what the site alone renders belongs here.
const profiles: Record<string, OrganizationProfile> = {}

function profileOf(id: string) {
  return { name: organizationNames[id], ...profiles[id] }
}

function cls(grade: Grade, classNo: ClassNumber): ClassOrganization {
  // Grade 1 is on the top floor (4F), and higher grades sit lower
  const floor = (5 - grade) as Floor
  const id = classOrgId(grade, classNo)
  const { name, image } = profileOf(id)
  return {
    kind: 'class',
    id,
    grade,
    classNo,
    name,
    image,
    location: { floor, room: `r${floor}0${classNo}` },
  }
}

function club(no: number): ClubOrganization {
  const id = clubOrgId(no)
  const { name, group = '', image } = profileOf(id)
  return { kind: 'club', id, group, name, image }
}

function committee(no: number): CommitteeOrganization {
  const id = committeeOrgId(no)
  const { name, image } = profileOf(id)
  return { kind: 'committee', id, name, image }
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
  return localized(org.name, locale)
}

/** Short label for list and panel heads. Empty while a group's name is undecided. */
export function organizationLabel(
  org: Organization,
  locale: string,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  return org.kind === 'class'
    ? t('explore.events.classLabel', { grade: org.grade, classNo: org.classNo })
    : organizationName(org, locale)
}
