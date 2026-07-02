export interface PageNode {
  path: string
  labelKey: string
  titleKey?: string
  keywordsKey?: string
}

export const pages: PageNode[] = [
  {
    path: '/',
    labelKey: 'sitemap.home',
    titleKey: 'search.titles.home',
    keywordsKey: 'search.keywords.home',
  },
  { path: '/news', labelKey: 'sitemap.news', keywordsKey: 'search.keywords.news' },
  { path: '/explore', labelKey: 'sitemap.explore', keywordsKey: 'search.keywords.explore' },
]
