export const grades = [1, 2, 3] as const
export const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const clubNumbers = [1, 2, 3, 4] as const
export const committeeNumbers = [1, 2, 3] as const

export type Grade = (typeof grades)[number]
export type ClassNumber = (typeof classNumbers)[number]

export function classOrgId(grade: Grade, classNo: ClassNumber): string {
  return `c${grade}-${classNo}`
}

export function clubOrgId(no: number): string {
  return `club-${no}`
}

export function committeeOrgId(no: number): string {
  return `com-${no}`
}

export const orgIds: readonly string[] = [
  ...grades.flatMap((grade) => classNumbers.map((classNo) => classOrgId(grade, classNo))),
  ...clubNumbers.map((no) => clubOrgId(no)),
  ...committeeNumbers.map((no) => committeeOrgId(no)),
]
