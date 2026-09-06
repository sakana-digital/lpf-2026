// Read by three separate bundles: the SPA, the Pages Functions (SSR meta and
// sitemap) and vite.config for generating _redirects. Because it crosses
// bundlers, this file must not import anything at all, aliases included.
export const LANGUAGES = ['ja', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/**
 * Origin of the canonical URLs. There is no custom domain and every deploy gets
 * its own <hash>.happo-sai.pages.dev, so production must always point here.
 */
export const SITE_ORIGIN = 'https://happo-sai.pages.dev'

export interface PageDefinition {
  /** Path on the Japanese side. Always ends with a slash */
  path: string
  /** Locale key suffix of the SEO meta (meta.pages.*). The root has no title, only the site name */
  metaKey: string
  /** Locale key of the label shown in the UI (PageTree / PageHeader) */
  labelKey: string
  /** Locale key of the heading in search results. Falls back to labelKey */
  titleKey?: string
  /** Listed in sitemap.xml and served with robots index, follow */
  indexable: boolean
  /** Shown in PageTree / SearchModal */
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

/** Pages shown in PageTree / SearchModal. The root comes first. */
export const navigablePages = pages.filter((page) => page.navigable)

export function isEnPath(pathname: string): boolean {
  return pathname === '/en' || pathname === '/en/' || pathname.startsWith('/en/')
}

/** Adds the trailing slash and returns the Japanese path without `/en`, plus the English one. */
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

/** Converts a Japanese path into the path for the given locale. */
export function localePath(jaPath: string, language: string): string {
  return language === 'en' ? enPath(jaPath) : jaPath
}

export function findPage(jaPath: string): PageDefinition | undefined {
  return byPath.get(jaPath)
}

/** Whether this is the ja or en top page. */
export function isRootPath(pathname: string): boolean {
  return localizedPath(pathname).jaPath === '/'
}
