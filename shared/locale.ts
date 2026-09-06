export type Locale = 'ja' | 'en'

/** Japanese is required; other locales are added as they are decided. */
export type LocalizedText = { ja: string } & Partial<Record<Locale, string>>

export function localized(text: LocalizedText | undefined, locale: string): string {
  if (!text) return ''
  return (locale.startsWith('en') && text.en) || text.ja
}
