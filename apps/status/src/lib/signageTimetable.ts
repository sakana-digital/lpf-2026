import { localized } from '@shared/locale'
import type { Locale } from '@shared/locale'
import { daySlots, festivalNow, parseTime, slotDisplayName } from '@shared/timetable'
import type { TimetableSlot } from '@shared/timetable'
import { venueLabels } from '@shared/venues'

/** How long before a slot starts the footer begins announcing it. */
export const LEAD_MINUTES = 10

/** The signage has no language switch. */
const LOCALE: Locale = 'ja'

function label(slot: TimetableSlot, minutes: number): string {
  const where = `${slotDisplayName(slot, LOCALE)} @ ${localized(venueLabels[slot.venue], LOCALE)}`
  const when = `${slot.start}-${slot.end}`
  const start = parseTime(slot.start)
  if (start <= minutes) return `開催中 ${when} ${where}`
  const prefix = start - minutes <= LEAD_MINUTES ? 'まもなく' : '次は'
  return `${prefix} ${when} ${where}`
}

/**
 * What the footer rotates through: everything running now, followed by whatever
 * comes next. Outside a slot only an imminent one qualifies, so the footer falls
 * back to the fixed notice for most of the day.
 */
export function footerMessages(now: Date, timetable = daySlots): string[] {
  const today = festivalNow(now)
  if (!today) return []
  const slots = timetable(today.day)
  const running = slots.filter(
    (slot) => parseTime(slot.start) <= today.minutes && today.minutes < parseTime(slot.end),
  )
  const next = slots.find((slot) => parseTime(slot.start) > today.minutes)
  const toLabel = (slot: TimetableSlot) => label(slot, today.minutes)
  if (running.length > 0) return [...running, ...(next ? [next] : [])].map(toLabel)
  if (next && parseTime(next.start) - today.minutes <= LEAD_MINUTES) return [toLabel(next)]
  return []
}

// The service worker reloads the signage after every deploy. Recomputing the
// offset then would snap the clock back to `at`, so the first one is kept for
// the life of the tab.
const OFFSET_KEY = 'signage-clock-offset'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Blocked site data: the clock just restarts from `at` on reload.
  }
}

/**
 * `?at=2026-09-26T10:22` shifts the clock so the timetable footer can be checked
 * outside the festival. The value is read in the device's own time zone, and the
 * clock keeps running from there across reloads of the same tab.
 */
export function clockOffset(search: string): number {
  const at = new URLSearchParams(search).get('at')
  if (!at) return 0
  const target = new Date(at).getTime()
  if (Number.isNaN(target)) return 0
  const stored = JSON.parse(readSession(OFFSET_KEY) ?? 'null') as {
    at: string
    offset: number
  } | null
  if (stored?.at === at) return stored.offset
  const offset = target - Date.now()
  writeSession(OFFSET_KEY, JSON.stringify({ at, offset }))
  return offset
}
