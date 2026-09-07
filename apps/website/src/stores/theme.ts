import { ref } from 'vue'

export type ResolvedTheme = 'light' | 'dark'

// A single state shared across the whole app
const resolvedTheme = ref<ResolvedTheme>('light')
let initialized = false

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply() {
  resolvedTheme.value = prefersDark().matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', resolvedTheme.value)
}

// Call once on startup, so it does not depend on a component mounting
export function initTheme() {
  if (initialized) return
  initialized = true

  apply()
  prefersDark().addEventListener('change', apply)
}

export function useTheme() {
  return { resolvedTheme }
}
