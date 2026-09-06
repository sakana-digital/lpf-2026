import { describe, expect, it } from 'vite-plus/test'
import { orgIds } from '@shared/organizations'

import { organizations } from './organizations'

describe('organizations', () => {
  it('matches the group ids and their order in shared', () => {
    expect(organizations.map((org) => org.id)).toEqual([...orgIds])
  })

  it('has no duplicate ids', () => {
    expect(new Set(orgIds).size).toBe(orgIds.length)
  })
})
