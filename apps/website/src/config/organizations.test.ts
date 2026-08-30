import { describe, expect, it } from 'vite-plus/test'
import { orgIds } from '@shared/organizations'

import { organizations } from './organizations'

describe('organizations', () => {
  it('shared の団体 ID と並び順まで一致する', () => {
    expect(organizations.map((org) => org.id)).toEqual([...orgIds])
  })

  it('ID が重複しない', () => {
    expect(new Set(orgIds).size).toBe(orgIds.length)
  })
})
