import { readStored, writeStored } from '@shared/storage'

const STORAGE_KEY = 'explore-last-tab'

export const EXPLORE_TABS = ['events', 'timetable'] as const

export type ExploreTab = (typeof EXPLORE_TABS)[number]

export function getLastExploreTab(): ExploreTab {
  const saved = readStored(STORAGE_KEY) ?? ''
  // The timetable tab used to be stored under its old name, still in returning visitors' browsers
  if (saved === 'schedule') return 'timetable'
  return (EXPLORE_TABS as readonly string[]).includes(saved) ? (saved as ExploreTab) : 'events'
}

export function setLastExploreTab(tab: ExploreTab) {
  writeStored(STORAGE_KEY, tab)
}
