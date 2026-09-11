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
  /**
   * Suffix of every locale key belonging to the page: meta.pages.*, and
   * sitemap.* / search.titles.* / search.keywords.* while it is navigable.
   */
  id: string
  /** Path on the Japanese side. Always ends with a slash */
  path: string
  /** Listed in sitemap.xml and served with robots index, follow */
  indexable: boolean
  /** Shown in SearchModal */
  navigable: boolean
  /** Older path the app redirects. Listed so its meta matches the target */
  legacy?: boolean
}

export const pages: PageDefinition[] = [
  { id: 'home', path: '/', indexable: true, navigable: true },
  { id: 'explore', path: '/explore/', indexable: false, navigable: true },
  { id: 'news', path: '/news/', indexable: true, navigable: true },
  { id: 'events', path: '/explore/events/', indexable: true, navigable: false },
  { id: 'timetable', path: '/explore/timetable/', indexable: true, navigable: false },
  { id: 'events', path: '/explore/nodes/', indexable: false, navigable: false, legacy: true },
  { id: 'timetable', path: '/explore/schedule/', indexable: false, navigable: false, legacy: true },
]

const byPath = new Map(pages.map((page) => [page.path, page]))

export const sitemapPaths = pages.filter((page) => page.indexable).map((page) => page.path)

/** Pages shown in SearchModal. The root comes first. */
export const navigablePages = pages.filter((page) => page.navigable)

export const legacyPages = pages.filter((page) => page.legacy)

/** Canonical path of a page. Legacy entries share an id, so the first one wins. */
export function pagePath(id: string): string {
  const page = pages.find((candidate) => candidate.id === id)
  if (!page) throw new Error(`Unknown page: ${id}`)
  return page.path
}

/** Label in SearchModal / PageHeader */
export function labelKey(id: string): string {
  return `sitemap.${id}`
}

/** Heading in search results */
export function titleKey(id: string): string {
  return `search.titles.${id}`
}

export function keywordsKey(id: string): string {
  return `search.keywords.${id}`
}

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
