import { localized } from './locale'
import type { LocalizedText } from './locale'
import { organizationProfile } from './organizations'
import type { Venue } from './venues'

export const festivalDates = ['2026-09-26', '2026-09-27'] as const

/** Opening hours on each festival day, JST. */
export const festivalHours = { open: '10:00', close: '15:30' } as const

export type FestivalDay = 1 | 2

export interface TimetableSlot {
  id: string
  day: FestivalDay
  venue: Venue
  start: string
  end: string
  title?: LocalizedText
  organizationId?: string
}

export const timetableSlots: TimetableSlot[] = [
  {
    id: 'd1-street-performance',
    day: 1,
    venue: 'courtyard',
    start: '10:30',
    end: '11:10',
    organizationId: 'club-18',
  },
  {
    id: 'd1-drama',
    day: 1,
    venue: 'avRoom',
    start: '11:00',
    end: '12:00',
    organizationId: 'club-12',
  },
  {
    id: 'd1-acoustic-guitar',
    day: 1,
    venue: 'courtyard',
    start: '11:15',
    end: '12:15',
    organizationId: 'club-11',
  },
  {
    id: 'd1-tennen-perma',
    day: 1,
    venue: 'courtyard',
    start: '12:15',
    end: '12:35',
    organizationId: 'vol-9',
  },
  {
    id: 'd1-dance',
    day: 1,
    venue: 'courtyard',
    start: '12:45',
    end: '13:05',
    organizationId: 'club-17',
  },
  {
    id: 'd1-school-info',
    day: 1,
    venue: 'avRoom',
    start: '13:00',
    end: '14:00',
    title: { ja: '学校説明会', en: 'School Briefing' },
    organizationId: 'vol-1',
  },
  {
    id: 'd1-poppys',
    day: 1,
    venue: 'courtyard',
    start: '13:15',
    end: '13:35',
    organizationId: 'vol-5',
  },
  {
    id: 'd1-light-music',
    day: 1,
    venue: 'courtyard',
    start: '13:35',
    end: '14:35',
    organizationId: 'club-20',
  },
  {
    id: 'd1-jazz-band',
    day: 1,
    venue: 'courtyard',
    start: '14:45',
    end: '15:25',
    organizationId: 'club-1',
  },
  {
    id: 'd2-street-performance',
    day: 2,
    venue: 'courtyard',
    start: '10:00',
    end: '10:40',
    organizationId: 'club-18',
  },
  {
    id: 'd2-acoustic-guitar',
    day: 2,
    venue: 'courtyard',
    start: '10:45',
    end: '11:45',
    organizationId: 'club-11',
  },
  {
    id: 'd2-drama',
    day: 2,
    venue: 'avRoom',
    start: '11:00',
    end: '12:00',
    organizationId: 'club-12',
  },
  {
    id: 'd2-dance',
    day: 2,
    venue: 'courtyard',
    start: '11:55',
    end: '12:15',
    organizationId: 'club-17',
  },
  {
    id: 'd2-non-quality',
    day: 2,
    venue: 'courtyard',
    start: '12:25',
    end: '12:45',
    title: { ja: 'NON QUALITY' },
    organizationId: 'vol-6',
  },
  {
    id: 'd2-iris-hz',
    day: 2,
    venue: 'courtyard',
    start: '12:45',
    end: '13:05',
    organizationId: 'vol-8',
  },
  {
    id: 'd2-school-info',
    day: 2,
    venue: 'avRoom',
    start: '13:00',
    end: '14:00',
    title: { ja: '学校説明会', en: 'School Briefing' },
    organizationId: 'vol-1',
  },
  {
    id: 'd2-seishun-neurose',
    day: 2,
    venue: 'courtyard',
    start: '13:05',
    end: '13:25',
    organizationId: 'vol-4',
  },
  {
    id: 'd2-nautilus',
    day: 2,
    venue: 'courtyard',
    start: '13:25',
    end: '13:45',
    organizationId: 'vol-7',
  },
  {
    id: 'd2-light-music',
    day: 2,
    venue: 'courtyard',
    start: '13:45',
    end: '14:45',
    organizationId: 'club-20',
  },
]

export function parseTime(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' })
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** The JST calendar date as `YYYY-MM-DD`, comparable against `festivalDates`. */
export function jstDate(now: Date): string {
  return dateFormat.format(now)
}

/** The festival day and minutes past midnight in JST, or null outside the festival. */
export function festivalNow(now: Date): { day: FestivalDay; minutes: number } | null {
  const index = festivalDates.indexOf(jstDate(now) as (typeof festivalDates)[number])
  if (index === -1) return null
  return { day: (index + 1) as FestivalDay, minutes: parseTime(timeFormat.format(now)) }
}

export function daySlots(day: FestivalDay): TimetableSlot[] {
  return timetableSlots
    .filter((slot) => slot.day === day)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start))
}

/**
 * Display name of a slot. The public site and the signage print the same string,
 * so whichever of the project and group name is decided is used, in that order.
 * With both it reads "project / group".
 */
export function slotDisplayName(slot: TimetableSlot, locale: string): string {
  const org = slot.organizationId ? organizationProfile(slot.organizationId)?.name : undefined
  return [localized(slot.title, locale), localized(org, locale)].filter(Boolean).join(' / ')
}
