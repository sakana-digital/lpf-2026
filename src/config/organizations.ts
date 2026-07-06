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

export type Organization = ClassOrganization | ClubOrganization

export const grades = [1, 2, 3] as const
export const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8] as const

function cls(grade: Grade, classNo: ClassNumber, name = '', nameEn?: string): ClassOrganization {
  const floor = (grade + 1) as Floor
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
]

export function getOrganization(id: string): Organization | undefined {
  return organizations.find((org) => org.id === id)
}

export function organizationName(org: Organization, locale: string): string {
  return (locale === 'en' && org.nameEn) || org.name
}
