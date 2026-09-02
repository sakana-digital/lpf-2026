export type Locale = 'ja' | 'en'

/** 日本語は必須、他言語は決まった分だけ足す。 */
export type LocalizedText = { ja: string } & Partial<Record<Locale, string>>

export function localized(text: LocalizedText | undefined, locale: string): string {
  if (!text) return ''
  return (locale.startsWith('en') && text.en) || text.ja
}
