import { ref } from 'vue'

const STORAGE_KEY = 'bookmarks'

const bookmarkIds = ref<string[]>([])
let initialized = false

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarkIds.value))
}

export function initBookmarks() {
  if (initialized) return
  initialized = true

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(saved)) {
      bookmarkIds.value = saved.filter((id): id is string => typeof id === 'string')
    }
  } catch {
    bookmarkIds.value = []
  }
}

function isBookmarked(id: string): boolean {
  return bookmarkIds.value.includes(id)
}

function toggleBookmark(id: string) {
  bookmarkIds.value = isBookmarked(id)
    ? bookmarkIds.value.filter((saved) => saved !== id)
    : [...bookmarkIds.value, id]
  persist()
}

export function useBookmarks() {
  return { bookmarkIds, isBookmarked, toggleBookmark }
}
