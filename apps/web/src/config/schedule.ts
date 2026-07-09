export const scheduleVenues = ['courtyard', 'avRoom'] as const
export type ScheduleVenue = (typeof scheduleVenues)[number]

export interface ScheduleSlot {
  id: string
  day: 1 | 2
  venue: ScheduleVenue
  start: string
  end: string
  title?: string
  titleKey?: string
  organizationId?: string
}

export const scheduleSlots: ScheduleSlot[] = [
  {
    id: 'd1-opening',
    day: 1,
    venue: 'courtyard',
    start: '10:30',
    end: '11:00',
    titleKey: 'explore.schedule.slots.opening',
  },
  {
    id: 'd1-live',
    day: 1,
    venue: 'courtyard',
    start: '13:00',
    end: '14:00',
    titleKey: 'explore.schedule.slots.liveStage',
  },
  {
    id: 'd1-screening',
    day: 1,
    venue: 'avRoom',
    start: '11:30',
    end: '12:30',
    titleKey: 'explore.schedule.slots.screening',
  },
  {
    id: 'd2-live',
    day: 2,
    venue: 'courtyard',
    start: '11:00',
    end: '12:00',
    titleKey: 'explore.schedule.slots.liveStage',
  },
  {
    id: 'd2-closing',
    day: 2,
    venue: 'avRoom',
    start: '14:00',
    end: '14:45',
    titleKey: 'explore.schedule.slots.closing',
  },
]
