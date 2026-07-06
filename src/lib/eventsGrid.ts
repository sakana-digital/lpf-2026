import { classNumbers, grades } from '@/config/organizations'
import type { Organization } from '@/config/organizations'

export const EVENT_COLUMNS = classNumbers.length

export interface EventRow {
  id: string
  labelKey: string
  labelParams?: Record<string, unknown>
  cells: (Organization | null)[]
}

export function buildEventRows(orgs: Organization[]): EventRow[] {
  const rows: EventRow[] = grades.map((grade) => ({
    id: `grade-${grade}`,
    labelKey: 'explore.events.gradeHeader',
    labelParams: { grade },
    cells: classNumbers.map(
      (classNo) =>
        orgs.find(
          (org) => org.kind === 'class' && org.grade === grade && org.classNo === classNo,
        ) ?? null,
    ),
  }))

  const clubs = orgs.filter((org) => org.kind === 'club')
  for (let i = 0; i < clubs.length; i += EVENT_COLUMNS) {
    const chunk: (Organization | null)[] = clubs.slice(i, i + EVENT_COLUMNS)
    while (chunk.length < EVENT_COLUMNS) chunk.push(null)
    rows.push({
      id: `clubs-${i / EVENT_COLUMNS}`,
      labelKey: 'explore.events.clubHeader',
      cells: chunk,
    })
  }

  return rows
}

export function columnTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) =>
    i === selected ? 'minmax(240px, 4fr)' : 'minmax(56px, 1fr)',
  ).join(' ')
}

export function rowTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) => (i === selected ? '280px' : '56px')).join(' ')
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
