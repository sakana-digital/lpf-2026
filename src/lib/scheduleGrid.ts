import type { ScheduleSlot } from '@/config/schedule'

export const SLOT_MINUTES = 5

const DEFAULT_START = '10:00'
const DEFAULT_END = '15:30'

export interface TimeAxis {
  startMinutes: number
  endMinutes: number
  rowCount: number
  hourMarks: { label: string; row: number }[]
}

export function parseTime(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function buildTimeAxis(slots: ScheduleSlot[]): TimeAxis {
  let start = parseTime(DEFAULT_START)
  let end = parseTime(DEFAULT_END)
  for (const slot of slots) {
    start = Math.min(start, parseTime(slot.start))
    end = Math.max(end, parseTime(slot.end))
  }
  start = Math.floor(start / 30) * 30
  end = Math.ceil(end / 30) * 30

  const hourMarks: TimeAxis['hourMarks'] = []
  for (let m = Math.ceil(start / 30) * 30; m <= end; m += 30) {
    hourMarks.push({ label: formatMinutes(m), row: (m - start) / SLOT_MINUTES + 1 })
  }

  return {
    startMinutes: start,
    endMinutes: end,
    rowCount: (end - start) / SLOT_MINUTES,
    hourMarks,
  }
}

export function slotRows(slot: ScheduleSlot, axis: TimeAxis): { start: number; end: number } {
  return {
    start: (parseTime(slot.start) - axis.startMinutes) / SLOT_MINUTES + 1,
    end: (parseTime(slot.end) - axis.startMinutes) / SLOT_MINUTES + 1,
  }
}
