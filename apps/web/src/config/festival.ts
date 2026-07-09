export const festivalDates = ['2026-09-26', '2026-09-27'] as const

const firstDate = festivalDates[0]
const lastDate = festivalDates[festivalDates.length - 1]!

export type FestivalDay = 1 | 2 | 'ended'

function todayInJst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date())
}

export function resolveFestivalDay(): FestivalDay | null {
  const today = todayInJst()
  const index = festivalDates.indexOf(today as (typeof festivalDates)[number])
  if (index !== -1) return (index + 1) as FestivalDay
  if (today > lastDate) return 'ended'
  return null
}

function weekday(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Asia/Tokyo' }).format(
    new Date(`${date}T00:00:00+09:00`),
  )
}

export function formatFestivalPeriod(locale: string): string {
  const [startYear, startMonth, startDay] = firstDate.split('-')
  const [endYear, endMonth, endDay] = lastDate.split('-')
  const start = `${startYear}.${startMonth}.${startDay} (${weekday(firstDate, locale)})`
  const endDate =
    startYear === endYear ? `${endMonth}.${endDay}` : `${endYear}.${endMonth}.${endDay}`
  const end = `${endDate} (${weekday(lastDate, locale)})`
  return `${start} – ${end}`
}
