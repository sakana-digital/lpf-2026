import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const DURING_FESTIVAL = '2026-09-26T03:00:00Z'
const BEFORE_FESTIVAL = '2026-09-01T03:00:00Z'

const fetchSpy = vi.fn()

// Reset the modules so the composable's polling state does not leak between tests
async function mountSubscriber(now: string) {
  vi.setSystemTime(new Date(now))
  vi.resetModules()
  const { createApp, defineComponent, h } = await import('vue')
  const { useOrgStatus } = await import('./useOrgStatus')
  const app = createApp(
    defineComponent({
      setup() {
        useOrgStatus()
        return () => h('div')
      },
    }),
  )
  app.mount(document.createElement('div'))
  await vi.advanceTimersByTimeAsync(0)
  return app
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('DEV', false)
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('useOrgStatus', () => {
  it('開催日は購読している間だけ 45 秒ごとに取得する', async () => {
    const app = await mountSubscriber(DURING_FESTIVAL)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('/api/status')

    await vi.advanceTimersByTimeAsync(45_000)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    app.unmount()
    await vi.advanceTimersByTimeAsync(180_000)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('開催期間外は購読しても一度も取得しない', async () => {
    const app = await mountSubscriber(BEFORE_FESTIVAL)
    await vi.advanceTimersByTimeAsync(180_000)
    expect(fetchSpy).not.toHaveBeenCalled()
    app.unmount()
  })

  it('開発サーバーでは開催期間外でも取得する', async () => {
    vi.stubEnv('DEV', true)
    const app = await mountSubscriber(BEFORE_FESTIVAL)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    app.unmount()
  })
})
