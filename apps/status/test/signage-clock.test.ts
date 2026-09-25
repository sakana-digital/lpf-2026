import { describe, expect, it } from 'vite-plus/test'
import { jstTime } from '@shared/timetable'

describe('jstTime', () => {
  it('reads JST with a 24-hour clock', () => {
    expect(jstTime(new Date('2026-09-26T00:05:09Z'))).toEqual(['09', '05', '09'])
    expect(jstTime(new Date('2026-09-26T15:00:00Z'))).toEqual(['00', '00', '00'])
  })
})
