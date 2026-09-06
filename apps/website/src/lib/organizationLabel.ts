import { localized } from '@shared/locale'
import type { Organization } from '@/data/organizations'

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
