import { describe, expect, it } from 'vite-plus/test'

import { buildEventRows } from './eventsGrid'
import type { Organization } from '@/data/organizations'
import type { OrgCategory } from '@shared/organizations'

function club(id: string, category?: OrgCategory): Organization {
  return { kind: 'club', id, category }
}

function rowsOf(orgs: Organization[]) {
  return buildEventRows(orgs)
    .filter((row) => !row.spacer && row.cells.some((cell) => cell != null))
    .map((row) => ({
      labelKey: row.labelKey,
      ids: row.cells.filter((cell) => cell != null).map((cell) => cell.id),
    }))
}

describe('buildEventRows', () => {
  it('lists clubs by category, in the order the categories are declared', () => {
    const rows = rowsOf([club('club-1', 'game'), club('club-2', 'food'), club('club-3', 'food')])
    expect(rows).toEqual([
      { labelKey: 'orgCategories.food', ids: ['club-2', 'club-3'] },
      { labelKey: 'orgCategories.game', ids: ['club-1'] },
    ])
  })

  it('keeps the clubs with no category in a trailing group', () => {
    const rows = rowsOf([club('club-1'), club('club-2', 'food')])
    expect(rows.map((row) => row.labelKey)).toEqual([
      'orgCategories.food',
      'explore.events.clubHeader',
    ])
  })

  it('leaves out a category no club runs', () => {
    const rows = rowsOf([club('club-1', 'food')])
    expect(rows).toHaveLength(1)
  })
})
