import { localized } from '@shared/locale'
import { organizationProfile } from '@shared/organizations'

/** Group name as the site prints it, falling back to the id while undecided. */
export function classOrgLabel(orgId: string): string {
  if (/^c\d-\d$/.test(orgId)) return orgId.slice(1)
  return localized(organizationProfile(orgId)?.name, 'ja') || orgId
}
