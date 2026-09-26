import type { NewsPostSlug } from '@/data/pages'

export type NewsPost = { type: 'post'; slug: NewsPostSlug; date: string }

export type NewsItem =
  | { type: 'instagram'; url: string }
  | { type: 'link'; url: string; titleKey: string; source: 'school' }
  | NewsPost

// Oldest first: append new entries at the end. Post dates are YYYY-MM-DDTHH:mm in JST.
const news: NewsItem[] = [
  {
    type: 'link',
    url: 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/seikatsu/bunkasai.html',
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
  {
    type: 'instagram',
    url: 'https://www.instagram.com/p/DdffNuSEtNo/',
  },
  {
    type: 'post',
    slug: 'cash-only',
    date: '2026-09-26T21:26',
  },
]

export const newsLinks = [...news].reverse()

export const newsPosts = news.filter((item): item is NewsPost => item.type === 'post')

export function findNewsPost(slug: NewsPostSlug): NewsPost | undefined {
  return newsPosts.find((post) => post.slug === slug)
}

export function newsItemKey(item: NewsItem): string {
  return item.type === 'post' ? item.slug : item.url
}
