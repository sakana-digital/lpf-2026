import { cva } from '@styled/css'
import type { CongestionLevel, SalesStatus } from '@shared/status'
import { CONGESTION_TONES, SALES_TONES } from '@/styles/status'

type SignageTone = 'good' | 'warn' | 'bad' | 'pause'

/** The signage palette carries no sold-out hue, so that one status borrows `bad`. */
export const SIGNAGE_SALES_TONES: Record<SalesStatus, SignageTone> = {
  ...SALES_TONES,
  soldout: 'bad',
}

export const SIGNAGE_CONGESTION_TONES: Record<CongestionLevel, SignageTone> = CONGESTION_TONES

export const signageBadge = cva({
  base: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '1.75cqw',
    padding: '0.14cqw 0.3cqw',
    border: '0.1cqw solid currentColor',
    fontSize: '0.8cqw',
    lineHeight: 1.15,
    textAlign: 'center',
  },
  variants: {
    tone: {
      good: { color: 'signage.good', background: 'signage.goodSoft' },
      warn: { color: 'signage.warn', background: 'signage.warnSoft' },
      bad: { color: 'signage.bad', background: 'signage.badSoft' },
      pause: { color: 'signage.pause', background: 'signage.pauseSoft' },
      muted: { color: 'signage.muted', background: 'signage.mutedSoft' },
    },
  },
})
