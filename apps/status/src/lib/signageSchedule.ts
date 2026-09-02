import { localized } from '@shared/locale'
import type { Locale } from '@shared/locale'
import { organizationNames } from '@shared/organizations'
import { daySlots, festivalNow, parseTime, venueLabels } from '@shared/schedule'
import type { ScheduleSlot } from '@shared/schedule'

/** How long before a slot starts the footer begins announcing it. */
export const LEAD_MINUTES = 10

/** The signage has no language switch. */
const LOCALE: Locale = 'ja'

function label(slot: ScheduleSlot, minutes: number): string {
  const org = slot.organizationId ? localized(organizationNames[slot.organizationId], LOCALE) : ''
  const where = `${org || localized(slot.title, LOCALE)} @ ${localized(venueLabels[slot.venue], LOCALE)}`
  const start = parseTime(slot.start)
  if (start <= minutes) {
    return `開催中 ${slot.start}-${slot.end} ${where}`
  }
  const prefix = start - minutes <= LEAD_MINUTES ? 'まもなく' : '次は'
  return `${prefix} ${slot.start} ${where}`
}

/**
 * What the footer rotates through: everything running now, followed by whatever
 * comes next. Outside a slot only an imminent one qualifies, so the footer falls
 * back to the fixed notice for most of the day.
 */
export function footerMessages(now: Date): string[] {
  const today = festivalNow(now)
  if (!today) return []
  const slots = daySlots(today.day)
  const running = slots.filter(
    (slot) => parseTime(slot.start) <= today.minutes && today.minutes < parseTime(slot.end),
  )
  const next = slots.find((slot) => parseTime(slot.start) > today.minutes)
  const toLabel = (slot: ScheduleSlot) => label(slot, today.minutes)
  if (running.length > 0) return [...running, ...(next ? [next] : [])].map(toLabel)
  if (next && parseTime(next.start) - today.minutes <= LEAD_MINUTES) return [toLabel(next)]
  return []
}

/**
 * `?at=2026-09-26T10:22` shifts the clock so the timetable footer can be checked
 * outside the festival. The value is read in the device's own time zone.
 */
export function clockOffset(search: string): number {
  const at = new URLSearchParams(search).get('at')
  if (!at) return 0
  const target = new Date(at).getTime()
  return Number.isNaN(target) ? 0 : target - Date.now()
}
