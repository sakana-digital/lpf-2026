import { parseTime } from '@shared/timetable'
import type { TimetableSlot } from '@shared/timetable'

export const SLOT_MINUTES = 5
/** Tall enough that the shortest slot on the timetable, 20 minutes, still fits its two lines. */
export const ROW_HEIGHT = 13

/** Only ever drawn on a day with nothing scheduled, so the grid is never zero rows tall. */
const FALLBACK_START = '10:00'
const FALLBACK_END = '15:30'

export interface TimeAxis {
  startMinutes: number
  endMinutes: number
  rowCount: number
  halfHourMarks: { label: string; row: number }[]
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function buildTimeAxis(slots: TimetableSlot[]): TimeAxis {
  const times = slots.length
    ? slots.flatMap((slot) => [parseTime(slot.start), parseTime(slot.end)])
    : [parseTime(FALLBACK_START), parseTime(FALLBACK_END)]
  const start = Math.floor(Math.min(...times) / 30) * 30
  const end = Math.ceil(Math.max(...times) / 30) * 30

  const halfHourMarks: TimeAxis['halfHourMarks'] = []
  for (let m = start; m <= end; m += 30) {
    halfHourMarks.push({ label: formatMinutes(m), row: (m - start) / SLOT_MINUTES + 1 })
  }

  return {
    startMinutes: start,
    endMinutes: end,
    rowCount: (end - start) / SLOT_MINUTES,
    halfHourMarks,
  }
}

/** Rounded to the row grid, so a slot off the SLOT_MINUTES beat still lands on whole rows. */
export function slotRows(slot: TimetableSlot, axis: TimeAxis): { start: number; end: number } {
  const row = (time: string) => Math.round((parseTime(time) - axis.startMinutes) / SLOT_MINUTES) + 1
  return { start: row(slot.start), end: row(slot.end) }
}
