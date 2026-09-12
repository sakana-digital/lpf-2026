import { defineConfig } from '@pandacss/dev'
import { tokens } from './theme/tokens'
import { semanticTokens } from './theme/semantic-tokens'
import { globalCss } from './theme/global-css'
import { recipes } from './theme/recipes'
import { keyframes } from './theme/keyframes'

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{ts,vue}'],
  outdir: 'styled-system',
  importMap: '@styled',
  strictTokens: false,
  // Touch Safari keeps :hover after a tap, so hover styles stay behind a real hover.
  conditions: {
    extend: { hover: ['@media (hover: hover)', '&:is(:hover, [data-hover])'] },
  },
  theme: {
    extend: {
      tokens,
      semanticTokens,
      recipes,
      keyframes,
      // Declared here so the `@container` blocks scattered across components name a real container.
      containerNames: ['workspace', 'admin-window'],
    },
  },
  globalCss,
  // Variants picked at runtime (the confirm dialog's tone, the rehearsal button) are not extractable.
  staticCss: { recipes: { button: ['*'] } },
})
