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
  {
    path: '/explore',
    labelKey: 'sitemap.explore',
    titleKey: 'search.titles.explore',
    keywordsKey: 'search.keywords.explore',
  },
  {
    path: '/news',
    labelKey: 'sitemap.news',
    titleKey: 'search.titles.news',
    keywordsKey: 'search.keywords.news',
  },
]
