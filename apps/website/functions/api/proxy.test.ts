import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { onRequestGet } from './[[path]]'

const STATUS_URL = 'https://lpf.jp/api/status'

function createCache() {
  const store = new Map<string, Response>()
  return {
    store,
    match: (request: Request) => Promise.resolve(store.get(request.url)),
    put: (request: Request, response: Response) => {
      store.set(request.url, response)
      return Promise.resolve()
    },
  }
}

function createContext(response: Response) {
  const pending: Promise<unknown>[] = []
  const state = { calls: 0 }
  const context = {
    request: new Request(STATUS_URL),
    env: {
      STATUS: {
        fetch: () => {
          state.calls++
          return Promise.resolve(response.clone())
        },
      },
    },
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise)
    },
  }
  return { state, settled: () => Promise.all(pending), context }
}

let cache: ReturnType<typeof createCache>

beforeEach(() => {
  cache = createCache()
  Object.assign(globalThis, { caches: { default: cache } })
})

describe('onRequestGet', () => {
  it('public なレスポンスを保存し、次のリクエストは Worker を呼ばない', async () => {
    const cacheable = new Response('[]', { headers: { 'Cache-Control': 'public, max-age=60' } })

    const miss = createContext(cacheable)
    await onRequestGet(miss.context)
    await miss.settled()
    expect(miss.state.calls).toBe(1)

    const hit = createContext(cacheable)
    const response = await onRequestGet(hit.context)
    expect(hit.state.calls).toBe(0)
    expect(await response.text()).toBe('[]')
  })

  it('キャッシュ不可のレスポンスは保存しない', async () => {
    const ctx = createContext(new Response('{}', { headers: { 'Cache-Control': 'no-store' } }))
    await onRequestGet(ctx.context)
    await ctx.settled()
    expect(cache.store.size).toBe(0)
  })
})
