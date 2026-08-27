import { findPage, localePath, localizedPath, SITE_ORIGIN, sitemapPaths } from '../src/config/pages'
import type { Language, PageDefinition } from '../src/config/pages'
import ja from '../src/locales/ja.json'
import en from '../src/locales/en.json'

interface PagesContext {
  request: Request
  env: { CF_PAGES_BRANCH?: string }
  next(): Promise<Response>
}

interface RewriterElement {
  append(content: string, options: { html: boolean }): void
  setAttribute(name: string, value: string): void
  setInnerContent(content: string): void
}

interface Rewriter {
  on(selector: string, handler: { element(element: RewriterElement): void }): Rewriter
  transform(response: Response): Response
}

declare const HTMLRewriter: {
  new (): Rewriter
}

interface PageMeta {
  title: string
  description: string
  imageAlt: string
  locale: 'ja_JP' | 'en_US'
  robots: string
}

interface PageMessages {
  title?: string
  description: string
}

const MESSAGES = { ja, en } as const

const FESTIVAL_DATES = ['2026-09-26', '2026-09-27'] as const
const OG_IMAGE_PATH = '/og/lpf-2026-og.jpg'
const ORGANIZER_NAMES: Record<Language, string> = {
  ja: '神奈川県立神奈川総合産業高等学校',
  en: 'Kanagawa Sogo Sangyo High School',
}

/**
 * ブランチプレビューが本番と検索結果を食い合わないようにする。
 * Pages が必ず注入する CF_PAGES_BRANCH で判定する。
 */
const PRODUCTION_BRANCH = 'main'

function isProduction(env: PagesContext['env']): boolean {
  return env.CF_PAGES_BRANCH === undefined || env.CF_PAGES_BRANCH === PRODUCTION_BRANCH
}

function canonicalOrigin(url: URL, production: boolean): string {
  return production ? SITE_ORIGIN : url.origin
}

function siteName(language: Language): string {
  return MESSAGES[language].pageTitle.suffix
}

function pageMessages(language: Language, metaKey: string): PageMessages | undefined {
  const messages: Record<string, PageMessages> = MESSAGES[language].meta.pages
  return messages[metaKey]
}

function pageTitle(page: PageDefinition, language: Language): string {
  const title = pageMessages(language, page.metaKey)?.title
  return title ? `${title} | ${siteName(language)}` : siteName(language)
}

function pageMeta(pathname: string, indexable: boolean): PageMeta | null {
  const { language, jaPath } = localizedPath(pathname)
  const page = findPage(jaPath)
  if (!page) return null

  return {
    title: pageTitle(page, language),
    description: pageMessages(language, page.metaKey)?.description ?? '',
    imageAlt: MESSAGES[language].meta.imageAlt,
    locale: language === 'en' ? 'en_US' : 'ja_JP',
    robots:
      indexable && page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
  }
}

function notFoundMeta(language: Language): PageMeta {
  const { title, description } = MESSAGES[language].meta.notFound
  return {
    title: `${title} | ${siteName(language)}`,
    description,
    imageAlt: MESSAGES[language].meta.imageAlt,
    locale: language === 'en' ? 'en_US' : 'ja_JP',
    robots: 'noindex, nofollow',
  }
}

function setAttribute(rewriter: Rewriter, selector: string, name: string, value: string): void {
  rewriter.on(selector, {
    element(element) {
      element.setAttribute(name, value)
    },
  })
}

/** ルートから当該ページまでの、テーブルに存在する祖先ページを列挙する。 */
function ancestors(jaPath: string): PageDefinition[] {
  const paths = ['/']
  let current = ''
  for (const segment of jaPath.split('/').filter(Boolean)) {
    current += `/${segment}`
    paths.push(`${current}/`)
  }
  return paths.map(findPage).filter((page): page is PageDefinition => page !== undefined)
}

function breadcrumbList(origin: string, jaPath: string, language: Language): unknown | null {
  const trail = ancestors(jaPath)
  if (trail.length < 2) return null

  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((page, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: pageMessages(language, page.metaKey)?.title ?? siteName(language),
      item: `${origin}${localePath(page.path, language)}`,
    })),
  }
}

function structuredData(origin: string, pathname: string): string {
  const { language, jaPath } = localizedPath(pathname)
  const graph: unknown[] = [
    {
      '@type': 'Event',
      name: siteName(language),
      startDate: `${FESTIVAL_DATES[0]}T09:00:00+09:00`,
      endDate: `${FESTIVAL_DATES[FESTIVAL_DATES.length - 1]}T15:00:00+09:00`,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      description: pageMessages(language, 'home')?.description ?? '',
      image: `${origin}${OG_IMAGE_PATH}`,
      url: `${origin}${localePath('/', language)}`,
      location: {
        '@type': 'Place',
        name: ORGANIZER_NAMES[language],
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'JP',
          addressRegion: language === 'en' ? 'Kanagawa' : '神奈川県',
        },
      },
      organizer: {
        '@type': 'Organization',
        name: ORGANIZER_NAMES[language],
        url: origin,
      },
    },
  ]

  const crumbs = breadcrumbList(origin, jaPath, language)
  if (crumbs) graph.push(crumbs)

  // `</script>` での早期終了を防ぐため、`<` のみ JSON のユニコードエスケープに置き換える
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  )
  return `<script type="application/ld+json">${json}</script>`
}

function sitemap(origin: string): string {
  const urls = sitemapPaths.flatMap((jaPath) => {
    const enPath = localePath(jaPath, 'en')
    return [
      { path: jaPath, alternate: enPath, language: 'ja', alternateLanguage: 'en' },
      { path: enPath, alternate: jaPath, language: 'en', alternateLanguage: 'ja' },
    ]
  })

  const entries = urls
    .map(
      ({ path, alternate, language, alternateLanguage }) => `  <url>
    <loc>${origin}${path}</loc>
    <xhtml:link rel="alternate" hreflang="${language}" href="${origin}${path}" />
    <xhtml:link rel="alternate" hreflang="${alternateLanguage}" href="${origin}${alternate}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${language === 'ja' ? path : alternate}" />
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
}

export async function onRequest({ request, env, next }: PagesContext): Promise<Response> {
  const url = new URL(request.url)
  const indexable = isProduction(env)
  const origin = canonicalOrigin(url, indexable)

  if (url.pathname === '/robots.txt') {
    const body = indexable
      ? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n'
    return new Response(body, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  if (url.pathname === '/sitemap.xml') {
    return new Response(sitemap(origin), {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    })
  }

  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response

  const meta = pageMeta(url.pathname, indexable)
  const { language, jaPath, enPath } = localizedPath(url.pathname)
  const canonicalUrl = `${origin}${url.pathname}`
  const imageUrl = `${origin}${OG_IMAGE_PATH}`
  const resolvedMeta = meta ?? notFoundMeta(language)

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(element) {
        element.setAttribute('lang', language)
      },
    })
    .on('head', {
      element(element) {
        element.append(
          `<link rel="canonical" href="${canonicalUrl}" />
          <link rel="alternate" hreflang="ja" href="${origin}${jaPath}" />
          <link rel="alternate" hreflang="en" href="${origin}${enPath}" />
          <link rel="alternate" hreflang="x-default" href="${origin}${jaPath}" />`,
          { html: true },
        )
        if (meta) element.append(structuredData(origin, url.pathname), { html: true })
      },
    })
    .on('title', {
      element(element) {
        element.setInnerContent(resolvedMeta.title)
      },
    })

  setAttribute(rewriter, 'meta[name="description"]', 'content', resolvedMeta.description)
  setAttribute(rewriter, 'meta[name="robots"]', 'content', resolvedMeta.robots)
  setAttribute(rewriter, 'meta[property="og:site_name"]', 'content', siteName(language))
  setAttribute(rewriter, 'meta[property="og:title"]', 'content', resolvedMeta.title)
  setAttribute(rewriter, 'meta[property="og:description"]', 'content', resolvedMeta.description)
  setAttribute(rewriter, 'meta[property="og:url"]', 'content', canonicalUrl)
  setAttribute(rewriter, 'meta[property="og:locale"]', 'content', resolvedMeta.locale)
  setAttribute(
    rewriter,
    'meta[property="og:locale:alternate"]',
    'content',
    resolvedMeta.locale === 'ja_JP' ? 'en_US' : 'ja_JP',
  )
  setAttribute(rewriter, 'meta[property="og:image"]', 'content', imageUrl)
  setAttribute(rewriter, 'meta[property="og:image:alt"]', 'content', resolvedMeta.imageAlt)
  setAttribute(rewriter, 'meta[name="twitter:title"]', 'content', resolvedMeta.title)
  setAttribute(rewriter, 'meta[name="twitter:description"]', 'content', resolvedMeta.description)
  setAttribute(rewriter, 'meta[name="twitter:image"]', 'content', imageUrl)
  setAttribute(rewriter, 'meta[name="twitter:image:alt"]', 'content', resolvedMeta.imageAlt)

  const rewritten = rewriter.transform(response)
  if (meta) return rewritten

  return new Response(rewritten.body, {
    status: 404,
    statusText: 'Not Found',
    headers: rewritten.headers,
  })
}

export const __test = { pageMeta, notFoundMeta, sitemap, structuredData }
