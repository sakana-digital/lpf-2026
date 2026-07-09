const STORAGE_KEY = 'explore-last-tab'

export const EXPLORE_TABS = ['map', 'events', 'schedule', 'nodes'] as const

export type ExploreTab = (typeof EXPLORE_TABS)[number]

export function getLastExploreTab(): ExploreTab {
  const saved = localStorage.getItem(STORAGE_KEY)
  return (EXPLORE_TABS as readonly string[]).includes(saved ?? '') ? (saved as ExploreTab) : 'map'
}

export function setLastExploreTab(tab: ExploreTab) {
  localStorage.setItem(STORAGE_KEY, tab)
}
