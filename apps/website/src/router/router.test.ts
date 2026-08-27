import { describe, expect, it } from 'vite-plus/test'
import { localePath, pages } from '@/config/pages'
import router from './index'

const allPaths = pages.flatMap((page) => [page.path, localePath(page.path, 'en')])

describe('router', () => {
  it('config/pages の全パスにルートが存在する', () => {
    for (const path of allPaths) {
      const resolved = router.resolve(path)
      expect(resolved.matched.length, path).toBeGreaterThan(0)
      expect(
        resolved.matched.some((record) => record.path.includes(':pathMatch')),
        path,
      ).toBe(false)
    }
  })

  it('テーブルに無いパスは not-found に落ちる', () => {
    for (const path of ['/unknown/', '/en/unknown/', '/explore/unknown/']) {
      expect(
        router.resolve(path).matched.some((r) => r.path.includes(':pathMatch')),
        path,
      ).toBe(true)
    }
  })
})
