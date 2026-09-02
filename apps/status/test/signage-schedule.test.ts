import { describe, expect, it } from 'vite-plus/test'
import { clockOffset, footerMessages } from '../src/lib/signageSchedule'

/** Day 1 is 2026-09-26, day 2 the 27th; JST is UTC+9. */
function at(time: string, date = '2026-09-26'): Date {
  return new Date(`${date}T${time}:00+09:00`)
}

describe('footerMessages', () => {
  it('stays quiet outside the festival', () => {
    expect(footerMessages(at('13:30', '2026-09-25'))).toEqual([])
    expect(footerMessages(at('13:30', '2026-09-28'))).toEqual([])
  })

  it('stays quiet until a slot is close', () => {
    expect(footerMessages(at('10:19'))).toEqual([])
    expect(footerMessages(at('10:20'))).toEqual(['まもなく 10:30 開会式 @ 中庭ステージ'])
  })

  it('rotates the running slot with whatever is next', () => {
    expect(footerMessages(at('10:40'))).toEqual([
      '開催中 10:30-11:00 開会式 @ 中庭ステージ',
      '次は 11:30 ⚠️ TBD: 上映企画 @ 視聴覚室',
    ])
  })

  it('calls the next slot imminent once it is within the lead time', () => {
    expect(footerMessages(at('10:55'))).toEqual([
      '開催中 10:30-11:00 開会式 @ 中庭ステージ',
      '次は 11:30 ⚠️ TBD: 上映企画 @ 視聴覚室',
    ])
    expect(footerMessages(at('11:21'))[0]).toBe('まもなく 11:30 ⚠️ TBD: 上映企画 @ 視聴覚室')
  })

  it('drops a slot the moment it ends', () => {
    expect(footerMessages(at('11:00'))).toEqual([])
    expect(footerMessages(at('14:00'))).toEqual([])
  })

  it('keeps the last slot alone once nothing follows', () => {
    expect(footerMessages(at('13:30'))).toEqual([
      '開催中 13:00-14:00 ⚠️ TBD: ステージ企画 @ 中庭ステージ',
    ])
  })

  it('reads the second day from its own date', () => {
    expect(footerMessages(at('11:30', '2026-09-27'))).toEqual([
      '開催中 11:00-12:00 ⚠️ TBD: ステージ企画 @ 中庭ステージ',
      '次は 14:00 閉会式 @ 視聴覚室',
    ])
  })
})

describe('clockOffset', () => {
  it('is neutral without the parameter', () => {
    expect(clockOffset('')).toBe(0)
    expect(clockOffset('?t=abc')).toBe(0)
  })

  it('ignores a value it cannot parse', () => {
    expect(clockOffset('?at=tomorrow')).toBe(0)
  })

  it('shifts the clock onto the requested moment', () => {
    const target = new Date('2026-09-26T10:22:00+09:00')
    const shifted = Date.now() + clockOffset(`?at=${target.toISOString()}`)
    expect(Math.abs(shifted - target.getTime())).toBeLessThan(1000)
  })
})
