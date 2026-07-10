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

export function isSalesStatus(value: unknown): value is SalesStatus {
  return typeof value === 'string' && (SALES_STATUSES as readonly string[]).includes(value)
}

export function isCongestionLevel(value: unknown): value is CongestionLevel {
  return typeof value === 'string' && (CONGESTION_LEVELS as readonly string[]).includes(value)
}
