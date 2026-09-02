import { localized } from './locale'
import type { LocalizedText } from './locale'
import { organizationNames } from './organizations'

export const festivalDates = ['2026-09-26', '2026-09-27'] as const

export type FestivalDay = 1 | 2

export const scheduleVenues = ['courtyard', 'avRoom'] as const
export type ScheduleVenue = (typeof scheduleVenues)[number]

export const venueLabels: Record<ScheduleVenue, LocalizedText> = {
  courtyard: { ja: '中庭ステージ', en: 'Courtyard Stage' },
  avRoom: { ja: '視聴覚室', en: 'AV Room' },
}

export interface ScheduleSlot {
  id: string
  day: FestivalDay
  venue: ScheduleVenue
  start: string
  end: string
  title?: LocalizedText
  organizationId?: string
}

export const scheduleSlots: ScheduleSlot[] = [
  {
    id: 'd1-opening',
    day: 1,
    venue: 'courtyard',
    start: '10:30',
    end: '11:00',
    title: { ja: '開会式', en: 'Opening Ceremony' },
  },
  {
    id: 'd1-screening',
    day: 1,
    venue: 'avRoom',
    start: '11:30',
    end: '12:30',
    title: { ja: '⚠️ TBD: 上映企画', en: '⚠️ TBD: Screening' },
    organizationId: 'com-1',
  },
  {
    id: 'd1-live',
    day: 1,
    venue: 'courtyard',
    start: '13:00',
    end: '14:00',
    title: { ja: '⚠️ TBD: ステージ企画', en: '⚠️ TBD: Stage Act' },
    organizationId: 'club-1',
  },
  {
    id: 'd2-live',
    day: 2,
    venue: 'courtyard',
    start: '11:00',
    end: '12:00',
    title: { ja: '⚠️ TBD: ステージ企画', en: '⚠️ TBD: Stage Act' },
    organizationId: 'club-2',
  },
  {
    id: 'd2-closing',
    day: 2,
    venue: 'avRoom',
    start: '14:00',
    end: '14:45',
    title: { ja: '閉会式', en: 'Closing Ceremony' },
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

export function daySlots(day: FestivalDay): ScheduleSlot[] {
  return scheduleSlots
    .filter((slot) => slot.day === day)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start))
}

/**
 * コマの表示名。公開サイトとサイネージが同じ文字列を出すよう、企画名と団体名を
 * 決まっている方から並べる。両方あれば「企画名 / 団体名」になる。
 */
export function slotDisplayName(slot: ScheduleSlot, locale: string): string {
  const org = slot.organizationId ? organizationNames[slot.organizationId] : undefined
  return [localized(slot.title, locale), localized(org, locale)].filter(Boolean).join(' / ')
}
