import { describe, expect, it } from 'vite-plus/test'
import type { OrgStatus } from '@shared/status'
import { domainRatio, formatClock, updateRows, updatesDomain } from '../src/lib/updatesChart'

const HOUR = 3600
const now = 1_790_000_000

function status(orgId: string, updatedAt: number): OrgStatus {
  return { orgId, sales: 'available', congestion: 'low', updatedAt }
}

describe('updateRows', () => {
  it('keeps the given order and leaves groups that never sent without a time', () => {
    expect(
      updateRows(['c2-3', 'c3-1', 'c3-2'], [status('c3-2', now - 60), status('c2-3', now)]),
    ).toEqual([
      { orgId: 'c2-3', updatedAt: now },
      { orgId: 'c3-1', updatedAt: null },
      { orgId: 'c3-2', updatedAt: now - 60 },
    ])
  })
})

describe('updatesDomain', () => {
  it('reaches back past the stalest update in half hours, between one and six hours', () => {
    const rows = (...ago: Array<number | null>) =>
      ago.map((value, index) => ({
        orgId: `c3-${index + 1}`,
        updatedAt: value === null ? null : now - value,
      }))

    expect(updatesDomain(rows(null), now)).toEqual({ from: now - HOUR, to: now })
    expect(updatesDomain(rows(600, null), now)).toEqual({ from: now - HOUR, to: now })
    expect(updatesDomain(rows(600, 2.2 * HOUR), now)).toEqual({ from: now - 2.5 * HOUR, to: now })
    expect(updatesDomain(rows(2.5 * HOUR), now)).toEqual({ from: now - 3 * HOUR, to: now })
    expect(updatesDomain(rows(30 * HOUR), now)).toEqual({ from: now - 6 * HOUR, to: now })
  })
})

describe('domainRatio', () => {
  it('clamps anything outside the domain to its edges', () => {
    const domain = { from: now - HOUR, to: now }
    expect(domainRatio(now - HOUR / 2, domain)).toBe(0.5)
    expect(domainRatio(now - 2 * HOUR, domain)).toBe(0)
    expect(domainRatio(now + HOUR, domain)).toBe(1)
  })
})

describe('formatClock', () => {
  it('adds the date only for another day', () => {
    const noon = Math.floor(new Date(2026, 8, 27, 12, 0).getTime() / 1000)
    expect(formatClock(noon - 2 * HOUR, noon)).toBe('10:00')
    expect(formatClock(noon - 24 * HOUR, noon)).toBe('9/26 12:00')
  })
})
