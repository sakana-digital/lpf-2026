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

interface OrganizationBase extends OrganizationProfile {
  id: string
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
  const id = classOrgId(grade, classNo)
  return { kind: 'class', id, grade, classNo, ...organizationProfile(id) }
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
