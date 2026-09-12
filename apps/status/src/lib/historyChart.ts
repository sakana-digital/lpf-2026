import { CONGESTION_LEVELS, SALES_STATUSES } from '@shared/status'
import type { CongestionLevel, SalesStatus, StatusHistoryEntry } from '@shared/status'

/** Unix seconds, inclusive. */
export interface Domain {
  from: number
  to: number
}

export interface LevelPoint {
  t: number
  /** Row index from the top; null leaves a gap (congestion while paused or sold out). */
  level: number | null
}

export interface Tick {
  t: number
  label: string
}

const MIN_SPAN = 10 * 60
/** What an empty or brand-new log shows, so the axis is never degenerate. */
const EMPTY_SPAN = 3 * 3600
const TICK_STEPS = [300, 600, 900, 1800, 3600, 7200, 3 * 3600, 6 * 3600, 12 * 3600, 86400]

export function salesLevel(sales: SalesStatus): number {
  return SALES_STATUSES.indexOf(sales)
}

export function congestionLevel(congestion: CongestionLevel | null): number | null {
  return congestion === null ? null : CONGESTION_LEVELS.indexOf(congestion)
}

/** The API answers newest first; the chart wants time to run left to right. */
export function chronological(entries: StatusHistoryEntry[]): StatusHistoryEntry[] {
  return [...entries].sort((a, b) => a.createdAt - b.createdAt)
}

export function fullDomain(entries: StatusHistoryEntry[], now: number): Domain {
  const first = entries.reduce((min, entry) => Math.min(min, entry.createdAt), now)
  return { from: Math.min(first, now - EMPTY_SPAN), to: now }
}

export function clampDomain(domain: Domain, bounds: Domain): Domain {
  const span = Math.min(Math.max(domain.to - domain.from, MIN_SPAN), bounds.to - bounds.from)
  let from = Math.max(domain.from, bounds.from)
  if (from + span > bounds.to) from = bounds.to - span
  return { from, to: from + span }
}

/** `factor` above 1 zooms in; the time under the pointer stays put. */
export function zoomDomain(domain: Domain, anchor: number, factor: number, bounds: Domain): Domain {
  const span = domain.to - domain.from
  const ratio = (anchor - domain.from) / span
  const next = span / factor
  const from = anchor - ratio * next
  return clampDomain({ from, to: from + next }, bounds)
}

export function panDomain(domain: Domain, delta: number, bounds: Domain): Domain {
  return clampDomain({ from: domain.from + delta, to: domain.to + delta }, bounds)
}

export function sameDomain(a: Domain, b: Domain): boolean {
  return a.from === b.from && a.to === b.to
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dayPart(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function clockPart(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatTime(sec: number): string {
  const date = new Date(sec * 1000)
  return `${dayPart(date)} ${clockPart(date)}`
}

/** Ticks land on local clock multiples; the first one and each new day carry the date. */
export function timeTicks(domain: Domain, maxCount: number): Tick[] {
  const span = domain.to - domain.from
  const step = TICK_STEPS.find((candidate) => span / candidate <= maxCount) ?? TICK_STEPS.at(-1)!
  const offset = new Date(domain.from * 1000).getTimezoneOffset() * 60
  const first = Math.ceil((domain.from - offset) / step) * step + offset
  const ticks: Tick[] = []
  let lastDay: string | null = null
  for (let t = first; t <= domain.to; t += step) {
    const date = new Date(t * 1000)
    const day = dayPart(date)
    const clock = clockPart(date)
    ticks.push({ t, label: day === lastDay ? clock : `${day} ${clock}` })
    lastDay = day
  }
  return ticks
}

/** The entry in force at `t`: the latest one at or before it. */
export function entryAt(entries: StatusHistoryEntry[], t: number): StatusHistoryEntry | null {
  let found: StatusHistoryEntry | null = null
  for (const entry of entries) {
    if (entry.createdAt > t) break
    found = entry
  }
  return found
}

/** A straight polyline through the points. Null levels lift the pen so the line has gaps. */
export function linePath(
  points: LevelPoint[],
  x: (t: number) => number,
  y: (level: number) => number,
): string {
  const fmt = (value: number) => value.toFixed(1)
  let d = ''
  let pen = false
  for (const point of points) {
    if (point.level === null) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${fmt(x(point.t))} ${fmt(y(point.level))}`
    pen = true
  }
  return d
}

/** The local hours `[fromHour, toHour)` of a `YYYY-MM-DD` date. */
export function dayDomain(date: string, fromHour: number, toHour: number): Domain {
  const midnight = Math.floor(new Date(`${date}T00:00:00`).getTime() / 1000)
  return { from: midnight + fromHour * 3600, to: midnight + toHour * 3600 }
}

export function unionDomain(first: Domain, ...rest: Domain[]): Domain {
  return rest.reduce(
    (acc, domain) => ({ from: Math.min(acc.from, domain.from), to: Math.max(acc.to, domain.to) }),
    first,
  )
}
