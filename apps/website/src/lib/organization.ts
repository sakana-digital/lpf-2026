import { localized } from '@shared/locale'
import { ORG_CATEGORIES } from '@shared/organizations'
import type { OrgCategory } from '@shared/organizations'
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

export function categoryLabelKey(category: OrgCategory): string {
  return `orgCategories.${category}`
}

export interface OrganizationSection {
  id: string
  labelKey: string
  members: Organization[]
}

/**
 * Clubs listed by what they run, in the order the categories are declared.
 * The ones with nothing decided yet trail behind under the plain club label.
 */
export function clubSections(orgs: Organization[]): OrganizationSection[] {
  const clubs = orgs.filter((org) => org.kind === 'club')
  return [
    ...ORG_CATEGORIES.map((category) => ({
      id: `clubs-${category}`,
      labelKey: categoryLabelKey(category),
      members: clubs.filter((org) => org.category === category),
    })),
    {
      id: 'clubs',
      labelKey: 'explore.events.clubHeader',
      members: clubs.filter((org) => !org.category),
    },
  ].filter((section) => section.members.length > 0)
}

/** Images ship as one file per group under this folder. */
const IMAGE_BASE = '/orgs/'

export function organizationImageSrc(org: Organization): string | undefined {
  return org.image ? `${IMAGE_BASE}${org.image}` : undefined
}
