import { describe, expect, it } from 'vite-plus/test'

import { filterEntries, groupEntries } from './search'
import type { SearchEntry } from './search'

function entry(partial: Partial<SearchEntry> & { to: string }): SearchEntry {
  return { section: 'pages', label: '', keywords: [], ...partial }
}

describe('filterEntries', () => {
  const entries: SearchEntry[] = [
    entry({ to: '/news/', label: 'News', keywords: ['お知らせ'] }),
    entry({ to: '/?org=c1-1', section: 'orgs', label: '1-1', sub: 'カフェ', keywords: ['milk'] }),
    entry({ to: '/', label: 'ホーム', keywords: ['top', 'news letter'] }),
  ]

  it('returns everything for an empty query', () => {
    expect(filterEntries('  ', entries)).toEqual(entries)
  })

  it('ranks a label above a keyword', () => {
    expect(filterEntries('news', entries).map((e) => e.to)).toEqual(['/news/', '/'])
  })

  it('matches the sub line and the keywords', () => {
    expect(filterEntries('カフェ', entries).map((e) => e.to)).toEqual(['/?org=c1-1'])
    expect(filterEntries('MILK', entries).map((e) => e.to)).toEqual(['/?org=c1-1'])
  })
})

describe('groupEntries', () => {
  it('keeps the section order and drops empty sections', () => {
    const grouped = groupEntries([
      entry({ to: '/?org=c1-1', section: 'orgs', label: '1-1' }),
      entry({ to: '/news/', label: 'News' }),
    ])
    expect(grouped.map((group) => group.section)).toEqual(['pages', 'orgs'])
  })
})
