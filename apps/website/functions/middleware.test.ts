import { describe, expect, it } from 'vite-plus/test'
import { localePath, pages, sitemapPaths } from '../src/data/pages'
import { __test } from './_middleware'

const { pageMeta, notFoundMeta, sitemap, structuredData } = __test
const ORIGIN = 'https://lpf.jp'

describe('pageMeta', () => {
  it('returns meta in both ja and en for every path in the table', () => {
    for (const page of pages) {
      for (const path of [page.path, localePath(page.path, 'en')]) {
        const meta = pageMeta(path, true)
        expect(meta, path).not.toBeNull()
        expect(meta!.title, path).not.toBe('')
        expect(meta!.description, path).not.toBe('')
      }
    }
  })

  it('sets index, follow only on indexable pages', () => {
    for (const page of pages) {
      const meta = pageMeta(page.path, true)!
      expect(meta.robots.startsWith('index'), page.path).toBe(page.indexable)
    }
  })

  it('marks even indexable pages noindex on preview deployments', () => {
    for (const page of pages) {
      expect(pageMeta(page.path, false)!.robots, page.path).toBe('noindex, follow')
    }
  })

  it('resolves the same page with or without the trailing slash', () => {
    expect(pageMeta('/news', true)).toEqual(pageMeta('/news/', true))
    expect(pageMeta('/en/news', true)).toEqual(pageMeta('/en/news/', true))
  })

  it('gives ja and en different titles', () => {
    expect(pageMeta('/news/', true)!.title).not.toBe(pageMeta('/en/news/', true)!.title)
  })

  it('returns null for paths outside the table', () => {
    expect(pageMeta('/unknown/', true)).toBeNull()
    expect(pageMeta('/en/unknown/', true)).toBeNull()
  })
})

describe('notFoundMeta', () => {
  it('is always noindex, nofollow', () => {
    expect(notFoundMeta('ja').robots).toBe('noindex, nofollow')
    expect(notFoundMeta('en').robots).toBe('noindex, nofollow')
  })
})

describe('sitemap', () => {
  const xml = sitemap(ORIGIN)

  it('lists every indexable path in both ja and en', () => {
    for (const path of sitemapPaths) {
      expect(xml, path).toContain(`<loc>${ORIGIN}${path}</loc>`)
      expect(xml, path).toContain(`<loc>${ORIGIN}${localePath(path, 'en')}</loc>`)
    }
    expect(xml.match(/<loc>/g)?.length).toBe(sitemapPaths.length * 2)
  })

  it('leaves out paths that are not indexable', () => {
    for (const page of pages.filter((p) => !p.indexable)) {
      expect(xml, page.path).not.toContain(`<loc>${ORIGIN}${page.path}</loc>`)
    }
  })

  it('carries all three hreflang variants on every URL', () => {
    expect(xml.match(/hreflang="x-default"/g)?.length).toBe(sitemapPaths.length * 2)
  })
})

describe('structuredData', () => {
  it('contains no `<` that could close the script tag', () => {
    for (const page of pages) {
      expect(structuredData(ORIGIN, page.path), page.path).not.toContain('</script><')
      const body = structuredData(ORIGIN, page.path).replace(
        /^<script type="application\/ld\+json">|<\/script>$/g,
        '',
      )
      expect(body, page.path).not.toContain('<')
    }
  })

  it('always includes Event, and BreadcrumbList on nested pages', () => {
    const parse = (path: string) =>
      JSON.parse(
        structuredData(ORIGIN, path).replace(
          /^<script type="application\/ld\+json">|<\/script>$/g,
          '',
        ),
      )

    const types = (path: string) =>
      (parse(path)['@graph'] as { '@type': string }[]).map((node) => node['@type'])

    expect(types('/')).toEqual(['Event'])
    expect(types('/explore/events/')).toEqual(['Event', 'BreadcrumbList'])
    expect(types('/en/explore/events/')).toEqual(['Event', 'BreadcrumbList'])
  })

  it('keeps the BreadcrumbList links on the current locale', () => {
    const body = structuredData(ORIGIN, '/en/explore/events/')
    expect(body).toContain(`${ORIGIN}/en/`)
    expect(body).toContain(`${ORIGIN}/en/explore/events/`)
  })
})
