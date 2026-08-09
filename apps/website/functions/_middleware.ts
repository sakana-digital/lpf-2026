interface PagesContext {
  request: Request
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

interface PageConfig {
  labels?: { ja: string; en: string }
  indexable: boolean
}

const SITE_NAMES = {
  ja: '八宝祭 - LiSA Papillon Festival 2026',
  en: 'Happo-sai - LiSA Papillon Festival 2026',
} as const

const DEFAULT_DESCRIPTIONS = {
  ja: '神奈川県立神奈川総合産業高等学校 全日制 2026年度 文化祭「八宝祭」です。2026年9月26日・27日開催です。',
  en: 'Happo-sai, the school festival of Kanagawa Sogo Sangyo High School, takes place September 26–27, 2026.',
} as const

const PAGES: Record<string, PageConfig> = {
  '/': { indexable: true },
  '/news/': {
    labels: { ja: 'ニュース', en: 'News' },
    indexable: true,
  },
  '/explore/': {
    labels: { ja: '企画を探す', en: 'Explore' },
    indexable: false,
  },
  '/explore/events/': {
    labels: { ja: 'イベント', en: 'Events' },
    indexable: true,
  },
  '/explore/schedule/': {
    labels: { ja: 'スケジュール', en: 'Schedule' },
    indexable: true,
  },
  '/explore/map/': {
    labels: { ja: '会場マップ', en: 'Venue Map' },
    indexable: true,
  },
  '/explore/nodes/': {
    labels: { ja: 'イベント', en: 'Events' },
    indexable: false,
  },
}

const SITEMAP_PATHS = Object.entries(PAGES)
  .filter(([, page]) => page.indexable)
  .map(([path]) => path)

function localizedPath(pathname: string): {
  language: 'ja' | 'en'
  jaPath: string
  enPath: string
} {
  const isEnglish = pathname === '/en/' || pathname.startsWith('/en/')
  const jaPath = isEnglish ? pathname.slice(3) || '/' : pathname
  return {
    language: isEnglish ? 'en' : 'ja',
    jaPath,
    enPath: jaPath === '/' ? '/en/' : `/en${jaPath}`,
  }
}

function pageMeta(pathname: string): PageMeta | null {
  const { language, jaPath } = localizedPath(pathname)
  const page = PAGES[jaPath]
  if (!page) return null

  const siteName = SITE_NAMES[language]
  const label = page.labels?.[language]

  return {
    title: label ? `${label} | ${siteName}` : siteName,
    description: DEFAULT_DESCRIPTIONS[language],
    imageAlt: language === 'en' ? 'Happo-sai 2026 key visual' : '八宝祭 2026 キービジュアル',
    locale: language === 'en' ? 'en_US' : 'ja_JP',
    robots: page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
  }
}

function setAttribute(rewriter: Rewriter, selector: string, name: string, value: string): void {
  rewriter.on(selector, {
    element(element) {
      element.setAttribute(name, value)
    },
  })
}

function sitemap(origin: string): string {
  const urls = SITEMAP_PATHS.flatMap((jaPath) => {
    const enPath = jaPath === '/' ? '/en/' : `/en${jaPath}`
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

export async function onRequest({ request, next }: PagesContext): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  if (url.pathname === '/sitemap.xml') {
    return new Response(sitemap(url.origin), {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    })
  }

  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response

  const meta = pageMeta(url.pathname)
  const { language, jaPath, enPath } = localizedPath(url.pathname)
  const canonicalUrl = `${url.origin}${url.pathname}`
  const imageUrl = `${url.origin}/posters/lpf-2026-main.jpg`
  const resolvedMeta =
    meta ??
    ({
      title:
        language === 'en'
          ? 'Page not found | ' + SITE_NAMES.en
          : 'ページが見つかりません | ' + SITE_NAMES.ja,
      description:
        language === 'en'
          ? 'The requested page could not be found.'
          : 'お探しのページは見つかりません。',
      imageAlt: language === 'en' ? 'Happo-sai 2026 key visual' : '八宝祭 2026 キービジュアル',
      locale: language === 'en' ? 'en_US' : 'ja_JP',
      robots: 'noindex, nofollow',
    } satisfies PageMeta)

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
          <link rel="alternate" hreflang="ja" href="${url.origin}${jaPath}" />
          <link rel="alternate" hreflang="en" href="${url.origin}${enPath}" />
          <link rel="alternate" hreflang="x-default" href="${url.origin}${jaPath}" />`,
          { html: true },
        )
      },
    })
    .on('title', {
      element(element) {
        element.setInnerContent(resolvedMeta.title)
      },
    })

  setAttribute(rewriter, 'meta[name="description"]', 'content', resolvedMeta.description)
  setAttribute(rewriter, 'meta[name="robots"]', 'content', resolvedMeta.robots)
  setAttribute(rewriter, 'meta[property="og:site_name"]', 'content', SITE_NAMES[language])
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
