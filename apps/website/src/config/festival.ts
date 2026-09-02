import { festivalDates, festivalNow, jstDate } from '@shared/schedule'
import type { FestivalDay } from '@shared/schedule'

const firstDate = festivalDates[0]
const lastDate = festivalDates[festivalDates.length - 1]!

export type FestivalPhase = FestivalDay | 'ended'

export function resolveFestivalDay(): FestivalPhase | null {
  const now = new Date()
  const today = festivalNow(now)
  if (today) return today.day
  return jstDate(now) > lastDate ? 'ended' : null
}

export function isFestivalDay(): boolean {
  return festivalNow(new Date()) !== null
}

function weekday(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(
    new Date(`${date}T00:00:00+09:00`),
  )
}

export function formatFestivalPeriod(locale: string): string {
  const [startYear, startMonth, startDay] = firstDate.split('-')
  const [endYear, endMonth, endDay] = lastDate.split('-')
  const start = `${startYear}/${startMonth}/${startDay} (${weekday(firstDate, locale)})`
  const endDate =
    startYear === endYear ? `${endMonth}/${endDay}` : `${endYear}/${endMonth}/${endDay}`
  const end = `${endDate} (${weekday(lastDate, locale)})`
  return `${start} – ${end}`
}
