import { ref } from 'vue'
import { readStored, writeStored } from '@/lib/storage'

const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

// A single state shared across the whole app
const theme = ref<Theme>('system')
const resolvedTheme = ref<ResolvedTheme>('light')
let initialized = false

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)')

function resolveAndApply(t: Theme) {
  const isDark = t === 'dark' || (t === 'system' && prefersDark().matches)
  resolvedTheme.value = isDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', resolvedTheme.value)
}

// The system preference is the default; a stored value is only an override.
function storedOverride(): Theme {
  const saved = readStored(STORAGE_KEY)
  return (THEMES as readonly string[]).includes(saved ?? '') ? (saved as Theme) : 'system'
}

function setTheme(t: Theme) {
  theme.value = t
  resolveAndApply(t)
  writeStored(STORAGE_KEY, t)
}

// Call once on startup, so it does not depend on a component mounting
export function initTheme() {
  if (initialized) return
  initialized = true

  theme.value = storedOverride()
  resolveAndApply(theme.value)

  prefersDark().addEventListener('change', () => {
    if (theme.value === 'system') resolveAndApply('system')
  })
}

export function useTheme() {
  return { theme, resolvedTheme, setTheme }
}
