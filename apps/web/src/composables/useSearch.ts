import { ref } from 'vue'

// アプリ全体で共有する単一の状態
const isOpen = ref(false)
let initialized = false

export function open() {
  isOpen.value = true
}

export function close() {
  isOpen.value = false
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

// アプリ起動時に一度だけ呼ぶ（コンポーネントのマウントに依存させない）
export function initSearch() {
  if (initialized) return
  initialized = true

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen.value) {
      close()
      return
    }
    if (event.key !== '/') return
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
    if (isTypingTarget(event.target)) return
    event.preventDefault()
    open()
  })
}

// クエリ（小文字・trim）でラベルとキーワードを部分一致フィルタ。空なら全件。
export interface SearchEntry {
  to: string
  label: string
  keywords: string[]
}

export function filterEntries(query: string, entries: SearchEntry[]): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(
    (entry) =>
      entry.label.toLowerCase().includes(q) ||
      entry.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
  )
}

export function useSearch() {
  return { isOpen, open, close }
}
