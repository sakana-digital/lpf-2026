import { defineSemanticTokens } from '@pandacss/dev'

/**
 * Dark is the base and `_osLight` follows the device, so the theme needs no script.
 * The signage stays dark because it paints from the `signage.*` tokens instead of these.
 */
export const semanticTokens = defineSemanticTokens({
  colors: {
    background: { value: { base: '#000', _osLight: '#fff' } },
    surface: { value: { base: '#000', _osLight: '#fff' } },
    surfaceSoft: { value: { base: 'oklch(100% 0 0 / 0.06)', _osLight: 'oklch(0% 0 0 / 0.04)' } },
    border: { value: { base: 'oklch(100% 0 0 / 0.16)', _osLight: 'oklch(0% 0 0 / 0.12)' } },
    borderStrong: { value: { base: 'oklch(100% 0 0 / 0.32)', _osLight: 'oklch(0% 0 0 / 0.3)' } },
    text: { value: { base: 'oklch(96% 0 0)', _osLight: 'oklch(16% 0 0)' } },
    textMute: { value: { base: 'oklch(100% 0 0 / 0.55)', _osLight: 'oklch(0% 0 0 / 0.55)' } },
    accent: { value: { base: '#fff', _osLight: 'oklch(18% 0 0)' } },
    accentStrong: { value: { base: 'oklch(100% 0 0 / 0.85)', _osLight: 'oklch(30% 0 0)' } },
    onAccent: { value: { base: '#000', _osLight: '#fff' } },
    status: {
      good: { value: { base: '{colors.hue.good}', _osLight: 'oklch(52% 0.14 158.84)' } },
      goodSoft: {
        value: {
          base: 'oklch(72% 0.17 152.505 / 0.16)',
          _osLight: 'oklch(52% 0.14 152.505 / 0.14)',
        },
      },
      warn: { value: { base: '{colors.hue.warn}', _osLight: 'oklch(56% 0.13 75)' } },
      bad: { value: { base: '{colors.hue.bad}', _osLight: 'oklch(53% 0.21 15)' } },
      badSoft: {
        value: { base: 'oklch(68% 0.23 10.492 / 0.16)', _osLight: 'oklch(53% 0.21 15 / 0.14)' },
      },
      soldout: { value: { base: '{colors.hue.soldout}', _osLight: 'oklch(50% 0.21 27)' } },
      pause: { value: { base: '{colors.hue.pause}', _osLight: 'oklch(58% 0.16 55)' } },
    },
    chip: {
      ink: { value: '{colors.surface}' },
      label: { value: 'oklch(100% 0 0 / 0.6)' },
      // The chip hues stay as vivid in light mode as in dark, so only the ink text needs a per-theme value.
      good: { value: '{colors.hue.good}' },
      warn: { value: '{colors.hue.warn}' },
      bad: { value: '{colors.hue.bad}' },
      pause: { value: '{colors.hue.pause}' },
      soldout: { value: '{colors.hue.soldout}' },
      onGood: { value: 'oklch(15% 0.02 260)' },
      onWarn: { value: 'oklch(25% 0.06 75)' },
      disabled: { value: { base: 'oklch(60% 0 0 / 0.5)', _osLight: 'oklch(40% 0 0 / 0.4)' } },
      onDisabled: { value: { base: 'oklch(100% 0 0 / 0.35)', _osLight: 'oklch(0% 0 0 / 0.35)' } },
    },
    scrim: { value: { base: 'oklch(0% 0 0 / 0.6)', _osLight: 'oklch(0% 0 0 / 0.45)' } },
    // Two series on one time axis; both pairs pass the CVD and contrast checks on their surface.
    chart: {
      sales: { value: { base: '#4f8ff7', _osLight: '#2563eb' } },
      congestion: { value: { base: '#c9780c', _osLight: '#d97706' } },
    },
  },
})
