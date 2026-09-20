import { describe, expect, it } from 'vite-plus/test'
import { named, room, tent, tentLetters, venue } from '@shared/organizations'
import { venues } from '@shared/venues'
import { campusFloors } from '@/data/campusMap'
import { organizations } from '@/data/organizations'
import { findRoom, isLinkable, organizationsByRoom, placeRoomIds } from './campusMap'

describe('placeRoomIds', () => {
  it('finds rooms by plan number, festival code, tent, venue and name', () => {
    expect(placeRoomIds(room('401'))).toEqual(['401'])
    expect(placeRoomIds(room('20C')).sort()).toEqual(['227', '237'])
    expect(placeRoomIds(tent('C'))).toEqual(['tent-C'])
    expect(placeRoomIds(venue('courtyard'))).toEqual(['stage'])
    expect(placeRoomIds(named({ ja: '図書室' }))).toEqual(['209'])
    expect(placeRoomIds(named({ ja: '弓道場' }))).toEqual(['kyudo'])
    expect(placeRoomIds(named({ ja: '校庭' }))).toEqual(['schoolyard'])
    expect(placeRoomIds(named({ ja: '体育館' }))).toEqual([])
    expect(placeRoomIds(undefined)).toEqual([])
  })
})

describe('campusFloors', () => {
  it('gives every linkable room an id unique across the floors', () => {
    const seen = new Set<string>()
    for (const floor of campusFloors) {
      for (const candidate of floor.rooms) {
        if (!isLinkable(candidate)) continue
        expect(seen.has(candidate.id), `${candidate.id} on ${floor.level}F`).toBe(false)
        seen.add(candidate.id)
      }
    }
  })

  it('draws every tent and venue', () => {
    for (const letter of tentLetters) {
      expect(findRoom(`tent-${letter}`), letter).toBeDefined()
    }
    for (const name of venues) {
      expect(placeRoomIds(venue(name)).length, name).toBeGreaterThan(0)
    }
  })

  it('bars entrances that lie on the floor plate', () => {
    for (const floor of campusFloors) {
      for (const point of floor.noEntry ?? []) {
        const onPlate = floor.slab.some(
          (box) =>
            point.x >= box.x &&
            point.x <= box.x + box.w &&
            point.y >= box.y &&
            point.y <= box.y + box.h,
        )
        expect(onPlate, `${floor.level}F ${point.x},${point.y}`).toBe(true)
      }
    }
  })

  it('draws every place a group is at', () => {
    const drawn = organizationsByRoom(organizations)
    for (const org of organizations) {
      if (!org.place) continue
      const ids = placeRoomIds(org.place)
      expect(ids.length, `${org.id} at ${JSON.stringify(org.place)}`).toBeGreaterThan(0)
      for (const id of ids) {
        expect(findRoom(id), `${org.id} at ${id}`).toBeDefined()
        expect(drawn.get(id)).toContain(org)
      }
    }
  })
})
