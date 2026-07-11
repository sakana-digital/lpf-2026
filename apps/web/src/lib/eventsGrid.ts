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

const EXPANDED_COLUMN = 'min(560px, 100vw - 32px)'

// セル内余白 18px を除いた 4:3 画像の高さ + 見出し・ステータス・メタ分
const EXPANDED_ROW = `calc((${EXPANDED_COLUMN} - 18px) * 3 / 4 + 110px)`

// 非選択時の 1fr 相当幅（ガター 40px + 左右余白 32px + 8px ギャップ）を
// px 系で表し，grid-template のトラック補間を効かせる
function baseColumn(count: number): string {
  return `max(56px, calc((100vw - ${40 + 32 + 8 * count}px) / ${count}))`
}

export function columnTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) =>
    i === selected ? `calc(${EXPANDED_COLUMN})` : baseColumn(count),
  ).join(' ')
}

export function rowTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) => (i === selected ? EXPANDED_ROW : '56px')).join(' ')
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
