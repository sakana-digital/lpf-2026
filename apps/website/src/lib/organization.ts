import { localized } from '@shared/locale'
import { ORG_CATEGORIES } from '@shared/organizations'
import type { OrgCategory, OrgDivision, OrgPlace } from '@shared/organizations'
import { venueLabels } from '@shared/venues'
import type { Organization } from '@/data/organizations'

type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * Name of the group itself. Classes are labelled from their grade and class
 * number, and a club or committee whose name is undecided falls back to its
 * category, so this never comes back empty.
 */
export function organizationGroupName(org: Organization, locale: string, t: Translate): string {
  if (org.kind === 'class') {
    return t('explore.events.classLabel', { grade: org.grade, classNo: org.classNo })
  }
  return localized(org.name, locale) || t(`explore.events.${org.kind}Header`)
}

/** Name of the project the group runs. Empty while it is undecided. */
export function organizationProjectName(org: Organization, locale: string): string {
  return localized(org.project, locale)
}

export function organizationImageAlt(org: Organization, locale: string, t: Translate): string {
  return (
    localized(org.imageAlt, locale) ||
    organizationProjectName(org, locale) ||
    organizationGroupName(org, locale, t)
  )
}

export function divisionLabelKey(division: OrgDivision): string {
  return `orgDivisions.${division}`
}

export function categoryLabelKey(category: OrgCategory): string {
  return `orgCategories.${category}`
}

export interface OrganizationSection {
  id: string
  labelKey: string
  members: Organization[]
}

/**
 * Groups listed by what they run, in the order the categories are declared.
 * The ones with nothing decided yet trail behind under the given label.
 */
export function categorySections(
  orgs: Organization[],
  idPrefix: string,
  restLabelKey: string,
): OrganizationSection[] {
  return [
    ...ORG_CATEGORIES.map((category) => ({
      id: `${idPrefix}-${category}`,
      labelKey: categoryLabelKey(category),
      members: orgs.filter((org) => org.category === category),
    })),
    {
      id: idPrefix,
      labelKey: restLabelKey,
      members: orgs.filter((org) => !org.category),
    },
  ].filter((section) => section.members.length > 0)
}

// Bundled so the URLs carry a content hash and a swapped image is never served stale
const images = import.meta.glob('../assets/orgs/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export type OrgImageWidth = 160 | 400

/** One file per group, with smaller copies in a subfolder per width. */
export function organizationImageSrc(org: Organization, width?: OrgImageWidth): string | undefined {
  if (!org.image) return undefined
  return images[`../assets/orgs/${width ? `${width}/` : ''}${org.image}`]
}

/** Where the group is, as one line. Empty while the place is undecided. */
export function organizationPlaceLabel(
  place: OrgPlace | undefined,
  locale: string,
  t: Translate,
): string {
  switch (place?.kind) {
    case 'room':
      return t('explore.place.room', { floor: place.room[0], room: place.room })
    case 'tent':
      return t('explore.place.tent', { tent: place.tent })
    case 'venue':
      return localized(venueLabels[place.venue], locale)
    case 'named':
      return localized(place.name, locale)
    default:
      return ''
  }
}
