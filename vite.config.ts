import { defineConfig } from 'vite-plus'

// Repo-wide vite-plus tooling config (pre-commit staged check, lint, format).
// Per-app build/dev config lives in each workspace's own vite.config.ts.
export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    semi: false,
    singleQuote: true,
  },
})
