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
