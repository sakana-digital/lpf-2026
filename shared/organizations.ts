import type { LocalizedText } from './locale'

export const grades = [1, 2, 3] as const
export const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const clubNumbers = [1, 2, 3, 4] as const
export const committeeNumbers = [1, 2, 3] as const

export type Grade = (typeof grades)[number]
export type ClassNumber = (typeof classNumbers)[number]
export type ClubNumber = (typeof clubNumbers)[number]
export type CommitteeNumber = (typeof committeeNumbers)[number]

export type ClassOrgId = `c${Grade}-${ClassNumber}`
export type ClubOrgId = `club-${ClubNumber}`
export type CommitteeOrgId = `com-${CommitteeNumber}`
export type OrgId = ClassOrgId | ClubOrgId | CommitteeOrgId

/*
 * The return types below are annotated on purpose: without them TypeScript widens
 * the template literal to string, and organizationProfiles stops rejecting typos.
 */

export function classOrgId(grade: Grade, classNo: ClassNumber): ClassOrgId {
  return `c${grade}-${classNo}`
}

export function clubOrgId(no: ClubNumber): ClubOrgId {
  return `club-${no}`
}

export function committeeOrgId(no: CommitteeNumber): CommitteeOrgId {
  return `com-${no}`
}

export const orgIds: readonly OrgId[] = [
  ...grades.flatMap((grade) => classNumbers.map((classNo) => classOrgId(grade, classNo))),
  ...clubNumbers.map((no) => clubOrgId(no)),
  ...committeeNumbers.map((no) => committeeOrgId(no)),
]

const orgIdSet: ReadonlySet<string> = new Set(orgIds)

export function isOrgId(id: string): id is OrgId {
  return orgIdSet.has(id)
}

/**
 * What a group runs, rather than what kind of group it is. Clubs are listed by
 * it and the node graph links everyone who shares one, so a class serving food
 * sits with a club doing the same. Add a key here plus its two locale labels.
 */
export const ORG_CATEGORIES = ['food', 'exhibit', 'performance', 'game'] as const

export type OrgCategory = (typeof ORG_CATEGORIES)[number]

/** The eight allergens Japanese labelling law requires to be declared. */
export const MANDATORY_ALLERGENS = [
  'shrimp',
  'crab',
  'walnut',
  'wheat',
  'buckwheat',
  'egg',
  'milk',
  'peanut',
] as const

/** The twenty further allergens the law only recommends declaring. */
export const OPTIONAL_ALLERGENS = [
  'almond',
  'abalone',
  'squid',
  'salmonRoe',
  'orange',
  'cashew',
  'kiwi',
  'beef',
  'sesame',
  'salmon',
  'mackerel',
  'soybean',
  'chicken',
  'banana',
  'pork',
  'matsutake',
  'peach',
  'yam',
  'apple',
  'gelatin',
] as const

export const ALLERGENS = [...MANDATORY_ALLERGENS, ...OPTIONAL_ALLERGENS] as const

export type Allergen = (typeof ALLERGENS)[number]

export interface MenuItem {
  name: LocalizedText
  /** Yen. Left unset while the price is undecided. */
  price?: number
  /**
   * An empty array means the group declared the item free of every allergen
   * above, while leaving this unset means it has declared nothing yet. The two
   * must never be collapsed: only the former is safe to present as allergen-free.
   */
  allergens?: readonly Allergen[]
}

export interface OrganizationProfile {
  /** Group name. Classes are labelled from their grade and class number instead. */
  name?: LocalizedText
  /** Name of the project the group runs. */
  project?: LocalizedText
  category?: OrgCategory
  description?: LocalizedText
  /** File name under /orgs/. One 4:3 image around 800px wide. */
  image?: string
  imageAlt?: LocalizedText
  /** Set by the groups serving food; its presence is what marks them as such. */
  menus?: readonly MenuItem[]
}

/**
 * Every public detail of a group. The site and the signage both read this, so a
 * name decided here shows up in both. Groups left out have nothing decided yet.
 */
export const organizationProfiles: Partial<Record<OrgId, OrganizationProfile>> = {}

export function organizationProfile(id: string): OrganizationProfile | undefined {
  return isOrgId(id) ? organizationProfiles[id] : undefined
}

export function servesFood(profile: OrganizationProfile | undefined): boolean {
  return (profile?.menus?.length ?? 0) > 0
}
