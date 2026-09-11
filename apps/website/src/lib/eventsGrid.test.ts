import { describe, expect, it } from 'vite-plus/test'

import { buildEventRows, EVENT_COLUMNS, sweepDelay } from './eventsGrid'
import type { EventsGrouping } from './eventsGrid'
import type { Organization } from '@/data/organizations'
import type { OrgCategory } from '@shared/organizations'

function club(id: string, category?: OrgCategory): Organization {
  return { kind: 'club', id, category }
}

function cls(grade: 1 | 2 | 3, classNo: 1 | 2, category?: OrgCategory): Organization {
  return { kind: 'class', id: `c${grade}-${classNo}`, grade, classNo, category }
}

function rowsOf(orgs: Organization[], grouping?: EventsGrouping) {
  return buildEventRows(orgs, grouping)
    .filter((row) => !row.spacer && row.cells.some((cell) => cell != null))
    .map((row) => ({
      labelKey: row.labelKey,
      ids: row.cells.filter((cell) => cell != null).map((cell) => cell.id),
    }))
}

describe('buildEventRows', () => {
  it('lists clubs by category, in the order the categories are declared', () => {
    const rows = rowsOf([
      club('club-1', 'cooking'),
      club('club-2', 'experience'),
      club('club-3', 'experience'),
    ])
    expect(rows).toEqual([
      { labelKey: 'orgCategories.experience', ids: ['club-2', 'club-3'] },
      { labelKey: 'orgCategories.cooking', ids: ['club-1'] },
    ])
  })

  it('keeps the clubs with no category in a trailing group', () => {
    const rows = rowsOf([club('club-1'), club('club-2', 'experience')])
    expect(rows.map((row) => row.labelKey)).toEqual([
      'orgCategories.experience',
      'explore.events.clubHeader',
    ])
  })

  it('leaves out a category no club runs', () => {
    const rows = rowsOf([club('club-1', 'experience')])
    expect(rows).toHaveLength(1)
  })

  it('mixes every kind under its category when grouped by category', () => {
    const rows = rowsOf(
      [cls(1, 1, 'cooking'), club('club-1', 'experience'), cls(2, 1, 'experience'), club('club-2')],
      'category',
    )
    expect(rows).toEqual([
      { labelKey: 'orgCategories.experience', ids: ['club-1', 'c2-1'] },
      { labelKey: 'orgCategories.cooking', ids: ['c1-1'] },
      { labelKey: 'explore.events.uncategorizedHeader', ids: ['club-2'] },
    ])
  })

  it('starts the category grouping without a spacer', () => {
    expect(buildEventRows([club('club-1', 'experience')], 'category')[0]?.spacer).toBeFalsy()
  })
})

describe('sweepDelay', () => {
  it('sweeps from the top-left corner towards the bottom-right', () => {
    const last = EVENT_COLUMNS - 1
    expect(sweepDelay(0, 0)).toBe(0)
    expect(sweepDelay(1, 0)).toBe(sweepDelay(0, 1))
    expect(sweepDelay(2, last)).toBeGreaterThan(sweepDelay(1, last))
    expect(sweepDelay(1, last)).toBeGreaterThan(sweepDelay(1, last - 1))
  })
})
