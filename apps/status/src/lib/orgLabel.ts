import { localized } from '@shared/locale'
import { organizationProfile } from '@shared/organizations'

function classOrgParams(orgId: string): { grade: number; classNo: number } | null {
  const match = /^c(\d)-(\d)$/.exec(orgId)
  if (!match) return null
  return { grade: Number(match[1]), classNo: Number(match[2]) }
}

/** Group name as the site prints it, falling back to the id while undecided. */
export function classOrgLabel(orgId: string): string {
  const params = classOrgParams(orgId)
  if (params) return `${params.grade}年次${params.classNo}組`
  return localized(organizationProfile(orgId)?.name, 'ja') || orgId
}
