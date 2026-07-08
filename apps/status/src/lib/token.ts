const STORAGE_KEY = 'status-token'

export function resolveToken(): string | null {
  const url = new URL(window.location.href)
  const fromQuery = url.searchParams.get('t')
  if (fromQuery) {
    localStorage.setItem(STORAGE_KEY, fromQuery)
    url.searchParams.delete('t')
    history.replaceState(null, '', url)
  }
  return fromQuery ?? localStorage.getItem(STORAGE_KEY)
}
