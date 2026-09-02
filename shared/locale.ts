export type Locale = 'ja' | 'en'
export type LocalizedText = Record<Locale, string>

export function localized(text: LocalizedText | undefined, locale: string): string {
  if (!text) return ''
  return locale === 'en' ? text.en : text.ja
}
