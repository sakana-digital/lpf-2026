import { describe, expect, it } from 'vite-plus/test'
import { localePath, pages } from '@/data/pages'
import router from './index'

const allPaths = pages.flatMap((page) => [page.path, localePath(page.path, 'en')])

describe('router', () => {
  it('has a route for every path in data/pages', () => {
    for (const path of allPaths) {
      const resolved = router.resolve(path)
      expect(resolved.matched.length, path).toBeGreaterThan(0)
      expect(
        resolved.matched.some((record) => record.path.includes(':pathMatch')),
        path,
      ).toBe(false)
    }
  })

  it('falls through to not-found for paths outside the table', () => {
    for (const path of ['/unknown/', '/en/unknown/', '/explore/unknown/']) {
      expect(
        router.resolve(path).matched.some((r) => r.path.includes(':pathMatch')),
        path,
      ).toBe(true)
    }
  })
})
