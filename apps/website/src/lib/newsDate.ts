/** Formats a YYYY-MM-DD post date for display, reading it as a JST calendar day. */
export function formatNewsDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Asia/Tokyo' }).format(
    new Date(`${date}T00:00:00+09:00`),
  )
}
