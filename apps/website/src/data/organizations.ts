import {
  classNumbers,
  classOrgId,
  clubNumbers,
  clubOrgId,
  committeeNumbers,
  committeeOrgId,
  grades,
  organizationProfile,
} from '@shared/organizations'
import type {
  ClassNumber,
  ClubNumber,
  CommitteeNumber,
  Grade,
  OrganizationProfile,
} from '@shared/organizations'

export { classNumbers, grades }
export type { ClassNumber, Grade }

export type Floor = 1 | 2 | 3 | 4

export interface VenueLocation {
  floor: Floor
  room: string
}

interface OrganizationBase extends OrganizationProfile {
  id: string
  location?: VenueLocation
}

export interface ClassOrganization extends OrganizationBase {
  kind: 'class'
  grade: Grade
  classNo: ClassNumber
}

export interface ClubOrganization extends OrganizationBase {
  kind: 'club'
}

export interface CommitteeOrganization extends OrganizationBase {
  kind: 'committee'
}

export type Organization = ClassOrganization | ClubOrganization | CommitteeOrganization

function cls(grade: Grade, classNo: ClassNumber): ClassOrganization {
  // Grade 1 is on the top floor (4F), and higher grades sit lower
  const floor = (5 - grade) as Floor
  const id = classOrgId(grade, classNo)
  return {
    kind: 'class',
    id,
    grade,
    classNo,
    ...organizationProfile(id),
    location: { floor, room: `r${floor}0${classNo}` },
  }
}

function club(no: ClubNumber): ClubOrganization {
  const id = clubOrgId(no)
  return { kind: 'club', id, ...organizationProfile(id) }
}

function committee(no: CommitteeNumber): CommitteeOrganization {
  const id = committeeOrgId(no)
  return { kind: 'committee', id, ...organizationProfile(id) }
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
