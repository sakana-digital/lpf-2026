import type { CongestionLevel, SalesStatus } from '@shared/status'

export const SALES_LABELS: Record<SalesStatus, string> = {
  available: '販売中',
  paused: '販売休止中',
  partial: '一部完売',
  low: '残りわずか',
  soldout: '全て完売',
}

/** The signage badge is too narrow for the full wording. */
export const SIGNAGE_SALES_LABELS: Record<SalesStatus, string> = {
  ...SALES_LABELS,
  paused: '販売休止',
}

export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  low: '空いている',
  medium: 'やや混雑',
  high: '混雑',
}
