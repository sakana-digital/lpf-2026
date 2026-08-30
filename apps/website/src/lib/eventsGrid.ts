import { classNumbers, grades } from '@/config/organizations'
import type { Organization } from '@/config/organizations'

export const EVENT_COLUMNS = classNumbers.length

// CSS と共有するグリッド寸法．GUTTER は行見出しの幅と列見出しの高さの共通値
export const GUTTER = 32
export const GAP = 8
export const INLINE_PADDING = 16

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

  rows.push(
    { id: 'spacer-clubs', spacer: true, cells: [] },
    ...chunkRows(
      orgs.filter((org) => org.kind === 'club'),
      'clubs',
      'explore.events.clubHeader',
    ),
    { id: 'spacer-committees', spacer: true, cells: [] },
    ...chunkRows(
      orgs.filter((org) => org.kind === 'committee'),
      'committees',
      'explore.events.committeeHeader',
    ),
  )

  return rows
}

// sticky な行見出しの下に潜り込まない幅に収める
const EXPANDED_COLUMN = `min(560px, 100vw - ${INLINE_PADDING * 2 + GUTTER + GAP}px)`

// セル内余白 18px を除いた 4:3 画像の高さ + 見出し・ステータス・メタ分
const EXPANDED_ROW = `calc((${EXPANDED_COLUMN} - 18px) * 3 / 4 + 110px)`

// 非選択時の 1fr 相当幅を px 系で表し，grid-template のトラック補間を効かせる
function baseColumn(count: number): string {
  const fixed = INLINE_PADDING * 2 + GUTTER + GAP * count
  return `max(88px, calc((100vw - ${fixed}px) / ${count}))`
}

export function columnTracks(count: number, selected: number | null): string {
  return Array.from({ length: count }, (_, i) =>
    i === selected ? `calc(${EXPANDED_COLUMN})` : baseColumn(count),
  ).join(' ')
}

export function rowTracks(rows: EventRow[], selected: number | null): string {
  return rows
    .map((row, i) => (i === selected ? EXPANDED_ROW : row.spacer ? `${GUTTER}px` : '56px'))
    .join(' ')
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
