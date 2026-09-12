import { cva } from '@styled/css'
import type { CongestionLevel, SalesStatus } from '@shared/status'

export type StatusTone = 'good' | 'warn' | 'bad' | 'pause' | 'soldout'

/** Sales and congestion share the palette but not the mapping: `low` is good for one, bad for the other. */
export const SALES_TONES = {
  available: 'good',
  partial: 'warn',
  low: 'bad',
  paused: 'pause',
  soldout: 'soldout',
} as const satisfies Record<SalesStatus, StatusTone>

export const CONGESTION_TONES = {
  low: 'good',
  medium: 'warn',
  high: 'bad',
} as const satisfies Record<CongestionLevel, StatusTone>

/** The dot only paints `--chip`; the filled chip below also needs an ink colour. */
const toneVariants = {
  good: { '--chip': 'token(colors.status.good)' },
  warn: { '--chip': 'token(colors.status.warn)' },
  bad: { '--chip': 'token(colors.status.bad)' },
  pause: { '--chip': 'token(colors.status.pause)' },
  soldout: { '--chip': 'token(colors.status.soldout)' },
} as const

export const statusDot = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    _before: {
      content: '""',
      width: '7px',
      height: '7px',
      borderRadius: 'dot',
      background: 'var(--chip)',
    },
  },
  variants: { tone: toneVariants },
})

const chipToneVariants = {
  good: { '--chip': 'token(colors.chip.good)', '--chip-ink': 'token(colors.chip.onGood)' },
  warn: { '--chip': 'token(colors.chip.warn)', '--chip-ink': 'token(colors.chip.onWarn)' },
  bad: { '--chip': 'token(colors.chip.bad)', '--chip-ink': 'token(colors.chip.onGood)' },
  pause: { '--chip': 'token(colors.chip.pause)', '--chip-ink': 'token(colors.chip.onWarn)' },
  soldout: { '--chip': 'token(colors.chip.soldout)', '--chip-ink': '#fff' },
} as const

export const statusChip = cva({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px 24px',
    border: '1px solid var(--chip)',
    background: 'chip.ink',
    color: 'chip.label',
    // Muted white on the dark chip; on the light surface the label reads best in plain black.
    _osLight: { color: '#000' },
    fontSize: '16px',
    fontWeight: 'black',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition:
      'background token(durations.base) ease, color token(durations.base) ease, transform token(durations.fast) ease',
    _before: {
      content: '""',
      position: 'absolute',
      left: '14px',
      width: '8px',
      height: '8px',
      borderRadius: 'dot',
      background: 'var(--chip)',
      transition: 'background token(durations.base) ease',
    },
    _active: { transform: 'scale(0.96)' },
    _disabled: {
      '--chip': 'token(colors.chip.disabled)',
      color: 'chip.onDisabled',
      cursor: 'not-allowed',
    },
  },
  variants: {
    tone: chipToneVariants,
    selected: {
      true: {
        background: 'var(--chip)',
        color: 'var(--chip-ink)',
        _before: { background: 'currentColor' },
        _disabled: { background: 'token(colors.chip.disabled)', color: 'token(colors.chip.label)' },
      },
      false: {},
    },
  },
  defaultVariants: { selected: false },
})
