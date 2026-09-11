import { classNumbers, grades } from '@/data/organizations'
import type { Organization } from '@/data/organizations'
import { categorySections } from '@/lib/organization'
import type { OrganizationSection } from '@/lib/organization'

/** Rows by grade, club and committee, or by what every group runs */
export const EVENT_GROUPINGS = ['group', 'category'] as const

export type EventsGrouping = (typeof EVENT_GROUPINGS)[number]

export const EVENT_COLUMNS = classNumbers.length

// Grid metrics shared with the CSS; GUTTER is both the row head width and the column head height
export const GUTTER = 32
export const GAP = 8
export const INLINE_PADDING = 16

/** Shape a cell takes from sharing the open row (tall) or the open column (wide). */
export type CellPreview = 'tall' | 'wide'

export interface EventRow {
  id: string
  labelKey?: string
  labelParams?: Record<string, unknown>
  cells: (Organization | null)[]
  spacer?: boolean
}

function chunkRows(orgs: Organization[], idPrefix: string, labelKey: string): EventRow[] {
  const rows: EventRow[] = []
  for (let i = 0; i < orgs.length; i += EVENT_COLUMNS) {
    const chunk: (Organization | null)[] = orgs.slice(i, i + EVENT_COLUMNS)
    while (chunk.length < EVENT_COLUMNS) chunk.push(null)
    rows.push({
      id: `${idPrefix}-${i / EVENT_COLUMNS}`,
      labelKey,
      cells: chunk,
    })
  }
  return rows
}

function spacer(id: string): EventRow {
  return { id: `spacer-${id}`, spacer: true, cells: [] }
}

// A spacer row parts the sections
function sectionRows(sections: OrganizationSection[]): EventRow[] {
  return sections.flatMap((section, i) => [
    ...(i > 0 ? [spacer(section.id)] : []),
    ...chunkRows(section.members, section.id, section.labelKey),
  ])
}

function groupRows(orgs: Organization[]): EventRow[] {
  return [
    ...grades.map((grade) => ({
      id: `grade-${grade}`,
      labelKey: 'explore.events.gradeHeader',
      labelParams: { grade },
      cells: classNumbers.map(
        (classNo) =>
          orgs.find(
            (org) => org.kind === 'class' && org.grade === grade && org.classNo === classNo,
          ) ?? null,
      ),
    })),
    spacer('clubs'),
    ...sectionRows([
      ...categorySections(
        orgs.filter((org) => org.kind === 'club'),
        'clubs',
        'explore.events.clubHeader',
      ),
      {
        id: 'committees',
        labelKey: 'explore.events.committeeHeader',
        members: orgs.filter((org) => org.kind === 'committee'),
      },
    ]),
  ]
}

function categoryRows(orgs: Organization[]): EventRow[] {
  return sectionRows(categorySections(orgs, 'category', 'explore.events.uncategorizedHeader'))
}

export function buildEventRows(
  orgs: Organization[],
  grouping: EventsGrouping = 'group',
): EventRow[] {
  return grouping === 'category' ? categoryRows(orgs) : groupRows(orgs)
}

// Narrow enough to clear the sticky row head
const EXPANDED_COLUMN = `min(560px, 100vw - ${INLINE_PADDING * 2 + GUTTER + GAP}px)`

// Cell padding on both sides plus its border
const CELL_INSET = 18

/**
 * Width the detail is laid out at, whatever the column is doing. Keeping it off
 * the animating column stops the 4:3 image from easing the height a second time.
 */
export const EXPANDED_CONTENT = `calc(${EXPANDED_COLUMN} - ${CELL_INSET}px)`

// Room for the head and the status badges side by side
const MIN_COLUMN = 128
const BASE_ROW = 64

// The unselected 1fr width in px units, so grid-template can interpolate the tracks
function baseColumn(count: number): string {
  const fixed = INLINE_PADDING * 2 + GUTTER + GAP * count
  return `max(${MIN_COLUMN}px, calc((100vw - ${fixed}px) / ${count}))`
}

export function columnTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) =>
    i === selected ? `calc(${EXPANDED_COLUMN})` : baseColumn(count),
  ).join(' ')
}

/**
 * The open row is a measured pixel height rather than `auto`, so the track
 * interpolates: opening, closing and moving between two cells of different
 * heights are all one transition, on the same element as the column width.
 */
export function rowTracks(
  rows: EventRow[],
  selected: number | null,
  expandedHeight = BASE_ROW,
): string {
  return rows
    .map((row, i) =>
      i === selected ? `${expandedHeight}px` : row.spacer ? `${GUTTER}px` : `${BASE_ROW}px`,
    )
    .join(' ')
}

/** Tiles join the intro sweep one diagonal after another, starting at the top-left corner. */
export const FLASH_STEP = 45
export const FLASH_DURATION = 900
/** Delay up to which a tile leads the sweep, so its thumbnail is waited for before it starts. */
export const FLASH_LEAD = FLASH_STEP * 2

export function flashDelay(row: number, col: number): number {
  return (row + col) * FLASH_STEP
}

export function findCellPosition(
  rows: EventRow[],
  orgId: string,
): { row: number; col: number } | null {
  for (let row = 0; row < rows.length; row++) {
    const col = rows[row]!.cells.findIndex((cell) => cell?.id === orgId)
    if (col !== -1) return { row, col }
  }
  return null
}
