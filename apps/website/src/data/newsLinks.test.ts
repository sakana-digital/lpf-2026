import { describe, expect, it } from 'vite-plus/test'
import { newsPosts } from '@/data/newsLinks'
import { newsPostSlugs } from '@/data/pages'
import { newsDateTime } from '@/lib/newsDate'
import ja from '@/locales/ja.json'
import en from '@/locales/en.json'

describe('newsPosts', () => {
  it('gives every post page exactly one entry dated with a time in the feed', () => {
    for (const slug of newsPostSlugs) {
      const entries = newsPosts.filter((post) => post.slug === slug)
      expect(entries, slug).toHaveLength(1)
      expect(entries[0]!.date, slug).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(Number.isNaN(new Date(newsDateTime(entries[0]!.date)).getTime()), slug).toBe(false)
    }
  })

  it('has a title and a body in both ja and en', () => {
    for (const messages of [ja, en]) {
      const posts: Record<string, { title?: string; body?: string }> = messages.news.posts
      for (const slug of newsPostSlugs) {
        expect(posts[slug]?.title, slug).toBeTruthy()
        expect(posts[slug]?.body, slug).toBeTruthy()
      }
    }
  })
})
