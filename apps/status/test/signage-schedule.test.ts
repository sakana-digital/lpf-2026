import { afterEach, describe, expect, it } from 'vite-plus/test'
import { organizationNames } from '@shared/organizations'
import { slotDisplayName } from '@shared/schedule'
import type { FestivalDay, ScheduleSlot } from '@shared/schedule'
import { clockOffset, footerMessages } from '../src/lib/signageSchedule'

/** Day 1 is 2026-09-26, day 2 the 27th; JST is UTC+9. */
function at(time: string, date = '2026-09-26'): Date {
  return new Date(`${date}T${time}:00+09:00`)
}

/** Stand-in for the real timetable so these cases survive schedule edits. */
const fixture: ScheduleSlot[] = [
  { id: 'd1-a', day: 1, venue: 'courtyard', start: '10:30', end: '11:00', title: { ja: '開会式' } },
  { id: 'd1-b', day: 1, venue: 'avRoom', start: '11:30', end: '12:30', title: { ja: '上映' } },
  { id: 'd1-c', day: 1, venue: 'courtyard', start: '13:00', end: '14:00', title: { ja: '演奏' } },
  { id: 'd2-a', day: 2, venue: 'courtyard', start: '11:00', end: '12:00', title: { ja: '演劇' } },
  { id: 'd2-b', day: 2, venue: 'avRoom', start: '11:30', end: '12:30', title: { ja: '講演' } },
  { id: 'd2-c', day: 2, venue: 'avRoom', start: '14:00', end: '14:45', title: { ja: '閉会式' } },
]

function timetable(day: FestivalDay): ScheduleSlot[] {
  return fixture.filter((slot) => slot.day === day)
}

function messages(now: Date): string[] {
  return footerMessages(now, timetable)
}

describe('footerMessages', () => {
  it('stays quiet outside the festival', () => {
    expect(messages(at('13:30', '2026-09-25'))).toEqual([])
    expect(messages(at('13:30', '2026-09-28'))).toEqual([])
  })

  it('stays quiet until a slot is close', () => {
    expect(messages(at('10:19'))).toEqual([])
    expect(messages(at('10:20'))).toEqual(['まもなく 10:30 開会式 @ 中庭ステージ'])
  })

  it('rotates the running slot with whatever is next', () => {
    expect(messages(at('10:40'))).toEqual([
      '開催中 10:30-11:00 開会式 @ 中庭ステージ',
      '次は 11:30 上映 @ 視聴覚室',
    ])
  })

  it('calls the next slot imminent once it is within the lead time', () => {
    expect(messages(at('11:21'))[0]).toBe('まもなく 11:30 上映 @ 視聴覚室')
  })

  it('drops a slot the moment it ends', () => {
    expect(messages(at('11:00'))).toEqual([])
    expect(messages(at('14:00'))).toEqual([])
  })

  it('keeps the last slot alone once nothing follows', () => {
    expect(messages(at('13:30'))).toEqual(['開催中 13:00-14:00 演奏 @ 中庭ステージ'])
  })

  it('lists every slot running at once', () => {
    expect(messages(at('11:45', '2026-09-27'))).toEqual([
      '開催中 11:00-12:00 演劇 @ 中庭ステージ',
      '開催中 11:30-12:30 講演 @ 視聴覚室',
      '次は 14:00 閉会式 @ 視聴覚室',
    ])
  })

  it('reads the second day from its own date', () => {
    expect(messages(at('11:25', '2026-09-27'))).toEqual([
      '開催中 11:00-12:00 演劇 @ 中庭ステージ',
      'まもなく 11:30 講演 @ 視聴覚室',
    ])
  })

  it('reads the real timetable when none is given', () => {
    expect(footerMessages(at('03:00'))).toEqual([])
  })
})

describe('slotDisplayName', () => {
  const orgId = 'test-org'
  const opening = { ...fixture[0]!, organizationId: orgId }

  afterEach(() => {
    delete organizationNames[orgId]
  })

  it('joins the title with the organization name', () => {
    organizationNames[orgId] = { ja: '軽音楽部', en: 'Light Music Club' }
    expect(slotDisplayName(opening, 'ja')).toBe('開会式 / 軽音楽部')
  })

  it('drops whichever half is undecided', () => {
    expect(slotDisplayName(opening, 'ja')).toBe('開会式')
    organizationNames[orgId] = { ja: '軽音楽部' }
    expect(slotDisplayName({ ...opening, title: undefined }, 'ja')).toBe('軽音楽部')
  })

  it('falls back to Japanese for a name with no translation', () => {
    organizationNames[orgId] = { ja: '軽音楽部' }
    expect(slotDisplayName(opening, 'en-US')).toBe('開会式 / 軽音楽部')
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
