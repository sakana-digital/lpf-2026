import { describe, expect, it } from 'vite-plus/test'
import { localePath, pages, sitemapPaths } from '../../../shared/pages'
import { __test } from './_middleware'

const { pageMeta, notFoundMeta, sitemap, structuredData } = __test
const ORIGIN = 'https://lpf.jp'

describe('pageMeta', () => {
  it('テーブルの全パスで ja/en ともメタを返す', () => {
    for (const page of pages) {
      for (const path of [page.path, localePath(page.path, 'en')]) {
        const meta = pageMeta(path, true)
        expect(meta, path).not.toBeNull()
        expect(meta!.title, path).not.toBe('')
        expect(meta!.description, path).not.toBe('')
      }
    }
  })

  it('indexable なページだけ index, follow になる', () => {
    for (const page of pages) {
      const meta = pageMeta(page.path, true)!
      expect(meta.robots.startsWith('index'), page.path).toBe(page.indexable)
    }
  })

  it('プレビュー環境では indexable なページも noindex にする', () => {
    for (const page of pages) {
      expect(pageMeta(page.path, false)!.robots, page.path).toBe('noindex, follow')
    }
  })

  it('末尾スラッシュの有無に関わらず同じページを引く', () => {
    expect(pageMeta('/news', true)).toEqual(pageMeta('/news/', true))
    expect(pageMeta('/en/news', true)).toEqual(pageMeta('/en/news/', true))
  })

  it('ja と en でタイトルが異なる', () => {
    expect(pageMeta('/news/', true)!.title).not.toBe(pageMeta('/en/news/', true)!.title)
  })

  it('テーブルに無いパスは null', () => {
    expect(pageMeta('/unknown/', true)).toBeNull()
    expect(pageMeta('/en/unknown/', true)).toBeNull()
  })
})

describe('notFoundMeta', () => {
  it('常に noindex, nofollow', () => {
    expect(notFoundMeta('ja').robots).toBe('noindex, nofollow')
    expect(notFoundMeta('en').robots).toBe('noindex, nofollow')
  })
})

describe('sitemap', () => {
  const xml = sitemap(ORIGIN)

  it('indexable な全パスを ja/en 揃えて含む', () => {
    for (const path of sitemapPaths) {
      expect(xml, path).toContain(`<loc>${ORIGIN}${path}</loc>`)
      expect(xml, path).toContain(`<loc>${ORIGIN}${localePath(path, 'en')}</loc>`)
    }
    expect(xml.match(/<loc>/g)?.length).toBe(sitemapPaths.length * 2)
  })

  it('indexable でないパスは含まない', () => {
    for (const page of pages.filter((p) => !p.indexable)) {
      expect(xml, page.path).not.toContain(`<loc>${ORIGIN}${page.path}</loc>`)
    }
  })

  it('全 URL に 3 種の hreflang を持つ', () => {
    expect(xml.match(/hreflang="x-default"/g)?.length).toBe(sitemapPaths.length * 2)
  })
})

describe('structuredData', () => {
  it('script タグを閉じうる `<` を含まない', () => {
    for (const page of pages) {
      expect(structuredData(ORIGIN, page.path), page.path).not.toContain('</script><')
      const body = structuredData(ORIGIN, page.path).replace(
        /^<script type="application\/ld\+json">|<\/script>$/g,
        '',
      )
      expect(body, page.path).not.toContain('<')
    }
  })

  it('Event を必ず含み、下層ページでは BreadcrumbList も含む', () => {
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
    expect(types('/explore/map/')).toEqual(['Event', 'BreadcrumbList'])
    expect(types('/en/explore/map/')).toEqual(['Event', 'BreadcrumbList'])
  })

  it('BreadcrumbList のリンクがロケールに追従する', () => {
    const body = structuredData(ORIGIN, '/en/explore/map/')
    expect(body).toContain(`${ORIGIN}/en/`)
    expect(body).toContain(`${ORIGIN}/en/explore/map/`)
  })
})
