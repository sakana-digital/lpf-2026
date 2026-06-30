import { ref } from 'vue'

export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// アプリ全体で共有する単一の状態
const theme = ref<Theme>('system')
const resolvedTheme = ref<ResolvedTheme>('light')
let initialized = false

function resolveAndApply(t: Theme) {
  const isDark =
    t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  resolvedTheme.value = isDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', resolvedTheme.value)
}

function setTheme(t: Theme) {
  theme.value = t
  localStorage.setItem('theme', t)
  resolveAndApply(t)
}

// アプリ起動時に一度だけ呼ぶ（コンポーネントのマウントに依存させない）
export function initTheme() {
  if (initialized) return
  initialized = true

  const saved = localStorage.getItem('theme') as Theme | null
  if (saved) theme.value = saved
  resolveAndApply(theme.value)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') resolveAndApply('system')
  })
}

export function useTheme() {
  return { theme, resolvedTheme, setTheme }
}
