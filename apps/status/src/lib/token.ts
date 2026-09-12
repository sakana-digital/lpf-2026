import { readStored, writeStored } from '@shared/storage'

const STORAGE_KEY = 'status-token'

export function resolveToken(): string | null {
  const url = new URL(window.location.href)
  const fromQuery = url.searchParams.get('t')
  if (fromQuery) {
    writeStored(STORAGE_KEY, fromQuery)
    url.searchParams.delete('t')
    history.replaceState(null, '', url)
  }
  return fromQuery ?? readStored(STORAGE_KEY)
}
