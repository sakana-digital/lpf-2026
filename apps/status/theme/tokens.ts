import { defineTokens } from '@pandacss/dev'

/** Signage runs on a fixed dark display, so its palette never follows the theme. */
const signage = {
  ink: { value: '#050505' },
  panel: { value: '#090909' },
  paper: { value: '#f7f7f2' },
  good: { value: '#68e49b' },
  goodSoft: { value: 'rgb(35 118 69 / 32%)' },
  warn: { value: '#ffe06b' },
  warnSoft: { value: 'rgb(136 109 15 / 32%)' },
  bad: { value: '#ff6f75' },
  badSoft: { value: 'rgb(135 27 36 / 38%)' },
  pause: { value: '#ffae67' },
  pauseSoft: { value: 'rgb(139 72 15 / 36%)' },
  muted: { value: '#777' },
  mutedSoft: { value: '#111' },
  standby: { value: '#171717' },
}

/** The status hues, kept raw so the chips can stay vivid while `status.*` follows the theme. */
const hue = {
  good: { value: 'oklch(72.428% 0.15175 158.84)' },
  warn: { value: 'oklch(82% 0.16 75)' },
  bad: { value: 'oklch(68% 0.23 10.492)' },
  pause: { value: 'oklch(72% 0.19 55)' },
  soldout: { value: 'oklch(52% 0.22 27)' },
}

export const tokens = defineTokens({
  colors: { signage, hue },
  fonts: {
    body: { value: ['system-ui'] },
    signage: { value: ['futura-pt', 'Futura', 'Noto Sans JP', 'sans-serif'] },
  },
  fontWeights: {
    bold: { value: '700' },
    black: { value: '900' },
  },
  radii: {
    dot: { value: '999px' },
  },
  durations: {
    fast: { value: '0.1s' },
    base: { value: '0.18s' },
  },
})
