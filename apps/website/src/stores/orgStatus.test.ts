import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const DURING_FESTIVAL = '2026-09-26T03:00:00Z'
const BEFORE_FESTIVAL = '2026-09-01T03:00:00Z'

const fetchSpy = vi.fn()

// Reset the modules so the store's once-only request does not leak between tests
async function start(now: string) {
  vi.setSystemTime(new Date(now))
  vi.resetModules()
  const { useOrgStatus } = await import('./orgStatus')
  const { statuses } = useOrgStatus()
  await vi.advanceTimersByTimeAsync(0)
  return { useOrgStatus, statuses }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('DEV', false)
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([{ orgId: 'c1-3', status: 'open' }]),
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('useOrgStatus', () => {
  it('fetches once on festival days, however many tabs use it', async () => {
    const { useOrgStatus, statuses } = await start(DURING_FESTIVAL)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith('/api/status')
    expect(statuses.value.get('c1-3')).toMatchObject({ status: 'open' })

    useOrgStatus()
    await vi.advanceTimersByTimeAsync(180_000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('never fetches outside the festival', async () => {
    await start(BEFORE_FESTIVAL)
    await vi.advanceTimersByTimeAsync(180_000)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches outside the festival on the dev server', async () => {
    vi.stubEnv('DEV', true)
    await start(BEFORE_FESTIVAL)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
