import { room as placeInRoom, tent as placeInTent, tentLetters } from '@shared/organizations'
import type { OrgPlace, TentLetter } from '@shared/organizations'
import { campusFloors, ROOM_KINDS } from '@/data/campusMap'
import type { FloorLevel, MapFloor, MapRoom } from '@/data/campusMap'
import { organizations } from '@/data/organizations'
import type { Organization } from '@/data/organizations'

export function isLinkable(room: MapRoom): boolean {
  return ROOM_KINDS[room.kind].linkable
}

/** The number printed on the plans, which is the id of every room that has one */
export function roomNumber(room: MapRoom): string | undefined {
  return /^\d/.test(room.id) ? room.id : undefined
}

/** The room as a group's place, so it is named the way the group listings name it */
export function roomPlace(room: MapRoom): OrgPlace | undefined {
  if (room.kind === 'tent' && (tentLetters as readonly string[]).includes(room.label ?? '')) {
    return placeInTent(room.label as TentLetter)
  }
  const number = roomNumber(room)
  return number ? placeInRoom(number) : undefined
}

function placeKey(place: OrgPlace): string {
  switch (place.kind) {
    case 'room':
      return `room:${place.room}`
    case 'tent':
      return `tent:${place.tent}`
    case 'venue':
      return `venue:${place.venue}`
    case 'named':
      return `named:${place.name.ja}`
  }
}

export interface MapRoomRef {
  floor: MapFloor
  room: MapRoom
}

// Placeable rooms carry ids unique across the floors, so one lookup serves
// every floor. A room answers to its plan number, its name, and any place it
// declares it hosts, so a group's place is one lookup too
const roomIndex = new Map<string, MapRoomRef>()
const placeIndex = new Map<string, string[]>()

function host(place: OrgPlace, id: string) {
  const key = placeKey(place)
  const ids = placeIndex.get(key) ?? []
  if (!ids.includes(id)) placeIndex.set(key, [...ids, id])
}

for (const floor of campusFloors) {
  for (const room of floor.rooms) {
    if (!isLinkable(room) || roomIndex.has(room.id)) continue
    roomIndex.set(room.id, { floor, room })
    const number = roomNumber(room)
    if (number) host(placeInRoom(number), room.id)
    if (room.name) host({ kind: 'named', name: room.name }, room.id)
    for (const place of room.places ?? []) host(place, room.id)
  }
}

export function findRoom(id: string): MapRoomRef | undefined {
  return roomIndex.get(id)
}

export function floorOfRoom(id: string | undefined): FloorLevel | undefined {
  return id ? findRoom(id)?.floor.level : undefined
}

/** The map rooms a group's place lands on. Empty while it is undecided or off the map. */
export function placeRoomIds(place: OrgPlace | undefined): string[] {
  return place ? (placeIndex.get(placeKey(place)) ?? []) : []
}

/** Groups by the room they run in, keeping the given order */
export function organizationsByRoom(orgs: Organization[]): Map<string, Organization[]> {
  const byRoom = new Map<string, Organization[]>()
  for (const org of orgs) {
    for (const id of placeRoomIds(org.place)) {
      const list = byRoom.get(id) ?? []
      list.push(org)
      byRoom.set(id, list)
    }
  }
  return byRoom
}

/** Every group on the map, by room, worked out once for all tabs */
export const roomOrganizations: ReadonlyMap<string, Organization[]> =
  organizationsByRoom(organizations)
