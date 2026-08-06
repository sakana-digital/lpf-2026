export const LANGUAGES = ['ja', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export interface PageDefinition {
  /** 日本語側のパス。必ず末尾スラッシュ */
  path: string
  /** SEO メタのロケールキー接尾辞（meta.pages.*）。ルートはサイト名のみなので title を持たない */
  metaKey: string
  /** UI 表示用ラベルのロケールキー（PageTree / PageHeader） */
  labelKey: string
  /** 検索結果に出す見出しのロケールキー。未指定なら labelKey を使う */
  titleKey?: string
  /** sitemap.xml に載せ、robots を index, follow にする */
  indexable: boolean
  /** PageTree / SearchModal に出す */
  navigable: boolean
  keywordsKey?: string
}

export const pages: PageDefinition[] = [
  {
    path: '/',
    metaKey: 'home',
    labelKey: 'sitemap.home',
    titleKey: 'search.titles.home',
    indexable: true,
    navigable: true,
    keywordsKey: 'search.keywords.home',
  },
  {
    path: '/explore/',
    metaKey: 'explore',
    labelKey: 'sitemap.explore',
    titleKey: 'search.titles.explore',
    indexable: false,
    navigable: true,
    keywordsKey: 'search.keywords.explore',
  },
  {
    path: '/news/',
    metaKey: 'news',
    labelKey: 'sitemap.news',
    titleKey: 'search.titles.news',
    indexable: true,
    navigable: true,
    keywordsKey: 'search.keywords.news',
  },
  {
    path: '/explore/events/',
    metaKey: 'events',
    labelKey: 'explore.tabs.events',
    indexable: true,
    navigable: false,
  },
  {
    path: '/explore/schedule/',
    metaKey: 'schedule',
    labelKey: 'explore.tabs.schedule',
    indexable: true,
    navigable: false,
  },
  {
    path: '/explore/map/',
    metaKey: 'map',
    labelKey: 'explore.tabs.map',
    indexable: true,
    navigable: false,
  },
  {
    path: '/explore/nodes/',
    metaKey: 'events',
    labelKey: 'explore.tabs.events',
    indexable: false,
    navigable: false,
  },
]

const byPath = new Map(pages.map((page) => [page.path, page]))

export const sitemapPaths = pages.filter((page) => page.indexable).map((page) => page.path)

export function isEnPath(pathname: string): boolean {
  return pathname === '/en' || pathname === '/en/' || pathname.startsWith('/en/')
}

/** 末尾スラッシュを補い、`/en` を剥がした日本語側パスと英語側パスを返す。 */
export function localizedPath(pathname: string): {
  language: Language
  jaPath: string
  enPath: string
} {
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`
  const english = isEnPath(withSlash)
  const jaPath = english ? withSlash.slice(3) || '/' : withSlash
  return {
    language: english ? 'en' : 'ja',
    jaPath,
    enPath: enPath(jaPath),
  }
}

function enPath(jaPath: string): string {
  return jaPath === '/' ? '/en/' : `/en${jaPath}`
}

/** 日本語側パスを、指定ロケール向けのパスに変換する。 */
export function localePath(jaPath: string, language: string): string {
  return language === 'en' ? enPath(jaPath) : jaPath
}

export function findPage(jaPath: string): PageDefinition | undefined {
  return byPath.get(jaPath)
}
