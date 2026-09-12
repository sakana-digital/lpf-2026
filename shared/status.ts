import { orgIds, organizationProfiles } from './organizations'
import type { OrgId } from './organizations'
import { festivalDates, festivalHours } from './timetable'

export const SALES_STATUSES = ['available', 'partial', 'low', 'paused', 'soldout'] as const
export type SalesStatus = (typeof SALES_STATUSES)[number]

export function hidesCongestion(sales: SalesStatus): boolean {
  return sales === 'paused' || sales === 'soldout'
}

export const CONGESTION_LEVELS = ['low', 'medium', 'high'] as const
export type CongestionLevel = (typeof CONGESTION_LEVELS)[number]

export interface OrgStatus {
  orgId: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  updatedAt: number
}

export type StatusSource = 'org' | 'admin'

/** How many log rows `GET /api/history` answers with, newest first. */
export const STATUS_HISTORY_LIMIT = 200

export interface StatusHistoryEntry {
  orgId: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  /** The group itself, or an admin updating on its behalf. */
  source: StatusSource
  createdAt: number
}

export interface SignageConfig {
  activeVideoKey: string | null
  /** Unix seconds. Until then the signage shows the standby panel instead of the video. */
  videoStartAt: number | null
  activeAudioKey: string | null
  /** Unix seconds. The audio plays once from here; null keeps the signage silent. */
  audioStartAt: number | null
  footerText: string
  alertEnabled: boolean
  alertText: string
  updatedAt: number
}

export const SIGNAGE_MEDIA_KINDS = ['video', 'audio'] as const
export type SignageMediaKind = (typeof SIGNAGE_MEDIA_KINDS)[number]

export interface SignageMedia {
  key: string
  name: string
  size: number
  uploadedAt: number
}

export interface SignagePayload {
  config: SignageConfig
  statuses: OrgStatus[]
  version: number
}

export interface SignageUploadStartResponse {
  key: string
  uploadId: string
  partSize: number
}

export interface SignageUploadedPart {
  partNumber: number
  etag: string
}

/** The groups that report a status: the ones selling or cooking food. Nothing else is accepted. */
export const STATUS_ORG_IDS: readonly OrgId[] = orgIds.filter((id) => {
  const category = organizationProfiles[id]?.category
  return category === 'foodSales' || category === 'cooking'
})

export function isStatusOrg(id: string): boolean {
  return (STATUS_ORG_IDS as readonly string[]).includes(id)
}

/** Unix seconds bounding when a stall may send on one festival day. */
export interface SubmitWindow {
  from: number
  until: number
}

export interface SubmitWindows {
  day1: SubmitWindow
  day2: SubmitWindow
}

/** Both bounds required, and a day that ends after it starts. The form and the Worker share the rule. */
export function parseSubmitWindow(value: unknown): SubmitWindow | null {
  const { from, until } = (value ?? {}) as Record<string, unknown>
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(until)) return null
  return (from as number) < (until as number)
    ? { from: from as number, until: until as number }
    : null
}

export const SUBMIT_DAYS = ['day1', 'day2'] as const

function jstEpoch(date: string, time: string): number {
  return Math.floor(new Date(`${date}T${time}:00+09:00`).getTime() / 1000)
}

/** The opening hours of each festival day, which the admin may then adjust. */
export function defaultSubmitWindows(): SubmitWindows {
  const [day1, day2] = festivalDates.map((date) => ({
    from: jstEpoch(date, festivalHours.open),
    until: jstEpoch(date, festivalHours.close),
  }))
  return { day1: day1!, day2: day2! }
}

export function isSubmitOpen(windows: SubmitWindows, nowSec: number): boolean {
  return SUBMIT_DAYS.some((day) => {
    const { from, until } = windows[day]
    return nowSec >= from && nowSec < until
  })
}

/** Why a status submit was refused. The Worker answers 403 with one of these as its `error`. */
export const SUBMIT_REFUSALS = ['not_accepted', 'closed'] as const
export type SubmitRefusal = (typeof SUBMIT_REFUSALS)[number]

export type SubmitPermission = { allowed: true } | { allowed: false; refusal: SubmitRefusal }

export interface Submitter {
  admin: boolean
  /** Whether the group is one of `STATUS_ORG_IDS`. Ignored for admins. */
  accepted: boolean
}

/** Unix seconds the admin started a rehearsal at, or null outside one. */
export type TestSince = number | null

/**
 * The single rule for who may write a status, shared so the form and the Worker
 * cannot disagree about it. Nothing is permitted that this does not grant.
 * A rehearsal (`testing`) lifts the hours only, never the accepted list.
 */
export function submitAllow(
  windows: SubmitWindows,
  nowSec: number,
  submitter: Submitter,
  testing = false,
): SubmitPermission {
  if (submitter.admin) return { allowed: true }
  if (!submitter.accepted) return { allowed: false, refusal: 'not_accepted' }
  if (!testing && !isSubmitOpen(windows, nowSec)) return { allowed: false, refusal: 'closed' }
  return { allowed: true }
}

export function isSubmitRefusal(value: unknown): value is SubmitRefusal {
  return typeof value === 'string' && (SUBMIT_REFUSALS as readonly string[]).includes(value)
}

export function isSalesStatus(value: unknown): value is SalesStatus {
  return typeof value === 'string' && (SALES_STATUSES as readonly string[]).includes(value)
}

export function isCongestionLevel(value: unknown): value is CongestionLevel {
  return typeof value === 'string' && (CONGESTION_LEVELS as readonly string[]).includes(value)
}
