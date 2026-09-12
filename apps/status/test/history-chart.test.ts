import { describe, expect, it } from 'vite-plus/test'
import type { StatusHistoryEntry } from '@shared/status'
import {
  clampDomain,
  dayDomain,
  entryAt,
  fullDomain,
  linePath,
  panDomain,
  timeTicks,
  unionDomain,
  zoomDomain,
} from '../src/lib/historyChart'

const HOUR = 3600
const now = 1_790_000_000

function entry(
  createdAt: number,
  sales: StatusHistoryEntry['sales'] = 'available',
): StatusHistoryEntry {
  return { orgId: 'c1-1', sales, congestion: 'low', source: 'org', createdAt }
}

describe('fullDomain', () => {
  it('starts at the first entry, or three hours back when the log is young', () => {
    expect(fullDomain([entry(now - 10 * HOUR)], now)).toEqual({ from: now - 10 * HOUR, to: now })
    expect(fullDomain([entry(now - 60)], now)).toEqual({ from: now - 3 * HOUR, to: now })
    expect(fullDomain([], now)).toEqual({ from: now - 3 * HOUR, to: now })
  })
})

describe('zoom and pan', () => {
  const bounds = { from: now - 10 * HOUR, to: now }

  it('zooms around the anchor and never leaves the bounds', () => {
    const anchor = now - 5 * HOUR
    const zoomed = zoomDomain(bounds, anchor, 2, bounds)
    expect(zoomed).toEqual({ from: now - 7.5 * HOUR, to: now - 2.5 * HOUR })
    expect(zoomDomain(zoomed, anchor, 0.1, bounds)).toEqual(bounds)
  })

  it('stops at the minimum span', () => {
    const tiny = zoomDomain(bounds, now, 10_000, bounds)
    expect(tiny.to - tiny.from).toBe(600)
    expect(tiny.to).toBe(now)
  })

  it('pans within the bounds', () => {
    const window = clampDomain({ from: now - 4 * HOUR, to: now - 2 * HOUR }, bounds)
    expect(panDomain(window, HOUR, bounds)).toEqual({ from: now - 3 * HOUR, to: now - HOUR })
    expect(panDomain(window, 5 * HOUR, bounds)).toEqual({ from: now - 2 * HOUR, to: now })
    expect(panDomain(window, -20 * HOUR, bounds)).toEqual({
      from: now - 10 * HOUR,
      to: now - 8 * HOUR,
    })
  })
})

describe('timeTicks', () => {
  it('picks a step that fits and dates the first tick only', () => {
    const ticks = timeTicks({ from: now - 3 * HOUR, to: now }, 8)
    expect(ticks.length).toBeGreaterThan(3)
    expect(ticks.length).toBeLessThanOrEqual(8)
    expect(ticks[1]!.t - ticks[0]!.t).toBe(1800)
    expect(ticks[0]!.label).toMatch(/^\d+\/\d+ \d\d:\d\d$/)
    expect(ticks[1]!.label).toMatch(/^\d\d:\d\d$/)
    expect(ticks.every((tick) => tick.t % 1800 === 0)).toBe(true)
  })
})

describe('entryAt', () => {
  const entries = [entry(100, 'available'), entry(200, 'partial'), entry(300, 'soldout')]

  it('returns the entry in force at a time', () => {
    expect(entryAt(entries, 50)).toBeNull()
    expect(entryAt(entries, 200)?.sales).toBe('partial')
    expect(entryAt(entries, 250)?.sales).toBe('partial')
    expect(entryAt(entries, 1000)?.sales).toBe('soldout')
  })
})

describe('linePath', () => {
  const x = (t: number) => t
  const y = (level: number) => level * 10

  it('joins the points with straight segments', () => {
    const d = linePath(
      [
        { t: 10, level: 0 },
        { t: 20, level: 2 },
        { t: 30, level: 1 },
      ],
      x,
      y,
    )
    expect(d).toBe('M10.0 0.0L20.0 20.0L30.0 10.0')
  })

  it('lifts the pen across null levels', () => {
    const d = linePath(
      [
        { t: 10, level: 1 },
        { t: 20, level: null },
        { t: 25, level: 0 },
        { t: 30, level: 2 },
      ],
      x,
      y,
    )
    expect(d).toBe('M10.0 10.0M25.0 0.0L30.0 20.0')
  })
})

describe('dayDomain and unionDomain', () => {
  it('spans the given local hours', () => {
    const day = dayDomain('2026-09-26', 10, 16)
    expect(day.to - day.from).toBe(6 * HOUR)
    expect(new Date(day.from * 1000).getHours()).toBe(10)
  })

  it('covers every domain given', () => {
    expect(unionDomain({ from: 5, to: 10 }, { from: 1, to: 3 }, { from: 8, to: 20 })).toEqual({
      from: 1,
      to: 20,
    })
  })
})
