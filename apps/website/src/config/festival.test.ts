import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { isFestivalDay } from './festival'

afterEach(() => {
  vi.useRealTimers()
})

function atJst(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('isFestivalDay', () => {
  it('returns true only on the two festival days in JST', () => {
    atJst('2026-09-25T14:59:00Z')
    expect(isFestivalDay()).toBe(false)

    atJst('2026-09-25T15:00:00Z')
    expect(isFestivalDay()).toBe(true)

    atJst('2026-09-27T14:59:00Z')
    expect(isFestivalDay()).toBe(true)

    atJst('2026-09-27T15:00:00Z')
    expect(isFestivalDay()).toBe(false)
  })
})
