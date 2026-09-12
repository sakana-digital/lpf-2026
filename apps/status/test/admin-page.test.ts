import { describe, expect, it } from 'vite-plus/test'
import { sanitizePage } from '../src/lib/adminPage'

const orgs = ['c1-1', 'c1-2']

describe('sanitizePage', () => {
  it('keeps a known organization and the open tab', () => {
    expect(sanitizePage({ view: 'status', orgId: 'c1-2' }, orgs)).toEqual({
      view: 'status',
      orgId: 'c1-2',
    })
    expect(sanitizePage({ view: 'signage', orgId: 'c1-2' }, orgs)).toEqual({
      view: 'signage',
      orgId: 'c1-2',
    })
  })

  it('falls back to the first organization', () => {
    expect(sanitizePage(null, orgs)).toEqual({ view: 'status', orgId: 'c1-1' })
    expect(sanitizePage({ view: 'status', orgId: 'gone' }, orgs)).toEqual({
      view: 'status',
      orgId: 'c1-1',
    })
    expect(sanitizePage('signage', orgs)).toEqual({ view: 'status', orgId: 'c1-1' })
  })

  it('keeps the group while the signage tab is open', () => {
    expect(sanitizePage({ view: 'signage', orgId: 'gone' }, orgs)).toEqual({
      view: 'signage',
      orgId: 'c1-1',
    })
  })
})
