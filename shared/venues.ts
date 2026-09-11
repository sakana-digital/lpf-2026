import type { LocalizedText } from './locale'

/** The two places the timetable runs on. A group based at one names it as its place. */
export const venues = ['courtyard', 'avRoom'] as const
export type Venue = (typeof venues)[number]

export const venueLabels: Record<Venue, LocalizedText> = {
  courtyard: { ja: '中庭ステージ', en: 'Courtyard Stage' },
  avRoom: { ja: '視聴覚室', en: 'AV Room' },
}
