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

export interface SubmitWindow {
  from: number | null
  until: number | null
}

export interface SubmitWindows {
  day1: SubmitWindow
  day2: SubmitWindow
}

export interface SignageConfig {
  orgIds: string[]
  activeVideoKey: string | null
  footerText: string
  alertEnabled: boolean
  alertText: string
  updatedAt: number
}

export interface SignageVideo {
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

export const SUBMIT_DAYS = ['day1', 'day2'] as const

function isWindowSet(window: SubmitWindow): boolean {
  return window.from !== null || window.until !== null
}

function containsNow(window: SubmitWindow, nowSec: number): boolean {
  if (window.from !== null && nowSec < window.from) return false
  if (window.until !== null && nowSec > window.until) return false
  return true
}

export function isSubmitOpen(windows: SubmitWindows, nowSec: number): boolean {
  const set = SUBMIT_DAYS.map((day) => windows[day]).filter(isWindowSet)
  if (set.length === 0) return true
  return set.some((window) => containsNow(window, nowSec))
}

export function isSalesStatus(value: unknown): value is SalesStatus {
  return typeof value === 'string' && (SALES_STATUSES as readonly string[]).includes(value)
}

export function isCongestionLevel(value: unknown): value is CongestionLevel {
  return typeof value === 'string' && (CONGESTION_LEVELS as readonly string[]).includes(value)
}
