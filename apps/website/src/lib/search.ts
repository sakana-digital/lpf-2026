export const SEARCH_SECTIONS = ['pages', 'orgs'] as const

export type SearchSection = (typeof SEARCH_SECTIONS)[number]

export interface SearchEntry {
  to: string
  section: SearchSection
  label: string
  /** Second line under the label, such as the project a group runs. */
  sub?: string
  keywords: string[]
}

export interface SearchGroup {
  section: SearchSection
  entries: SearchEntry[]
}

// A hit on what is printed outranks one on a hidden keyword, and a label that
// starts with the query outranks one that merely contains it.
function score(entry: SearchEntry, query: string): number {
  const label = entry.label.toLowerCase()
  if (label.startsWith(query)) return 3
  if (label.includes(query)) return 2
  if (entry.sub?.toLowerCase().includes(query)) return 2
  if (entry.keywords.some((keyword) => keyword.toLowerCase().includes(query))) return 1
  return 0
}

export function filterEntries(query: string, entries: SearchEntry[]): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries
    .map((entry) => ({ entry, score: score(entry, q) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((hit) => hit.entry)
}

export function groupEntries(entries: SearchEntry[]): SearchGroup[] {
  return SEARCH_SECTIONS.map((section) => ({
    section,
    entries: entries.filter((entry) => entry.section === section),
  })).filter((group) => group.entries.length > 0)
}
