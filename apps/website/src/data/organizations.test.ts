import { describe, expect, it } from 'vite-plus/test'
import { ALLERGENS, ORG_CATEGORIES, organizationProfiles, orgIds } from '@shared/organizations'

import { organizations } from './organizations'

describe('organizations', () => {
  it('matches the group ids and their order in shared', () => {
    expect(organizations.map((org) => org.id)).toEqual([...orgIds])
  })

  it('has no duplicate ids', () => {
    expect(new Set(orgIds).size).toBe(orgIds.length)
  })

  it('profiles only known groups', () => {
    const known = new Set<string>(orgIds)
    expect(Object.keys(organizationProfiles).filter((id) => !known.has(id))).toEqual([])
  })

  it('gives every group a known category, or none at all', () => {
    const known = new Set<string>(ORG_CATEGORIES)
    const unknown = organizations
      .map((org) => org.category)
      .filter((category) => category != null && !known.has(category))
    expect(unknown).toEqual([])
  })

  it('lists only known allergens on the menus', () => {
    const known = new Set<string>(ALLERGENS)
    const unknown = organizations
      .flatMap((org) => org.menus ?? [])
      .flatMap((item) => item.allergens ?? [])
      .filter((allergen) => !known.has(allergen))
    expect(unknown).toEqual([])
  })
})
