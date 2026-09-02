import { schoolFestivalUrl } from './social'

export type NewsItem =
  | { type: 'instagram'; url: string }
  | { type: 'link'; url: string; titleKey: string; source: 'school' }

// Oldest first: append new entries at the end.
const news: NewsItem[] = [
  {
    type: 'link',
    url: schoolFestivalUrl,
    titleKey: 'news.links.bunkasai',
    source: 'school',
  },
  {
    type: 'link',
    url: 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/nyugaku/setsumeikai.html',
    titleKey: 'news.links.setsumeikai',
    source: 'school',
  },
  {
    type: 'instagram',
    url: 'https://www.instagram.com/p/DcTXfnlTd7G/',
  },
]

export const newsLinks = [...news].reverse()
