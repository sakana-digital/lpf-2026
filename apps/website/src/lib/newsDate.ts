/** Reads a YYYY-MM-DDTHH:mm post date as JST, for the datetime attribute. */
export function newsDateTime(date: string): string {
  return `${date}+09:00`
}

/** Formats a post date and time for display in JST. */
export function formatNewsDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(newsDateTime(date)))
}
