import type { OrgStatus } from '@shared/status'
import { formatTime, type Domain } from '@/lib/historyChart'

const MIN_SPAN = 3600
/** A group quieter than this runs off the left edge instead of squeezing everyone else. */
const MAX_SPAN = 6 * 3600
const SPAN_STEP = 1800

export interface UpdateRow {
  orgId: string
  /** Unix seconds of the last save, whatever it said; null for a group that never sent. */
  updatedAt: number | null
}

/** One row per group, in the order given, so a save never reshuffles the chart. */
export function updateRows(orgIds: readonly string[], statuses: OrgStatus[]): UpdateRow[] {
  const byOrg = new Map(statuses.map((status) => [status.orgId, status.updatedAt]))
  return orgIds.map((orgId) => ({ orgId, updatedAt: byOrg.get(orgId) ?? null }))
}

/**
 * Ends now and reaches back to the stalest update, rounded up to a half hour and kept
 * between one and six hours.
 */
export function updatesDomain(rows: UpdateRow[], now: number): Domain {
  const oldest = rows.reduce((min, row) => Math.min(min, row.updatedAt ?? now), now)
  const span = Math.ceil((now - oldest) / SPAN_STEP) * SPAN_STEP
  return { from: now - Math.min(Math.max(span, MIN_SPAN), MAX_SPAN), to: now }
}

/** Where `t` sits across the domain, from 0 to 1. */
export function domainRatio(t: number, domain: Domain): number {
  const ratio = (t - domain.from) / (domain.to - domain.from)
  return Math.min(Math.max(ratio, 0), 1)
}

/** The clock time, with the date only when it is not the same day as `now`. */
export function formatClock(sec: number, now: number): string {
  const full = formatTime(sec)
  const [day, clock] = full.split(' ')
  return day === formatTime(now).split(' ')[0] ? clock! : full
}
