import { ref, onMounted, onUnmounted } from 'vue'

export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export function useTheme() {
  const theme = ref<Theme>('system')
  const resolvedTheme = ref<ResolvedTheme>('light')
  let mq: MediaQueryList | null = null

  function resolveAndApply(t: Theme) {
    const isDark =
      t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    resolvedTheme.value = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', resolvedTheme.value)
  }

  function onSystemChange() {
    if (theme.value === 'system') resolveAndApply('system')
  }

  function setTheme(t: Theme) {
    theme.value = t
    localStorage.setItem('theme', t)
    resolveAndApply(t)
  }

  onMounted(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) theme.value = saved
    resolveAndApply(theme.value)

    mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', onSystemChange)
  })

  onUnmounted(() => {
    mq?.removeEventListener('change', onSystemChange)
  })

  return { theme, resolvedTheme, setTheme }
}
