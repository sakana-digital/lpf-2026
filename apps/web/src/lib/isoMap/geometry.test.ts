import { describe, expect, it } from 'vite-plus/test'
import { floorPlans } from '@/config/isoMap'
import { floorSegments } from './geometry'

describe('floorSegments', () => {
  it('draws the shared corridor and classroom boundary only once', () => {
    const secondFloor = floorPlans.find(({ floor }) => floor === 2)
    expect(secondFloor).toBeDefined()

    const sharedBoundary = floorSegments(secondFloor!).filter(
      ({ start, end }) => start.z === 8 && end.z === 8 && start.x <= 6 && end.x >= 60,
    )

    expect(sharedBoundary).toHaveLength(1)
    expect(sharedBoundary[0]?.start.x).toBeCloseTo(6)
    expect(sharedBoundary[0]?.end.x).toBeCloseTo(60)
  })

  it('draws adjacent classroom boundaries only once', () => {
    const secondFloor = floorPlans.find(({ floor }) => floor === 2)
    expect(secondFloor).toBeDefined()
    const segments = floorSegments(secondFloor!)

    for (const x of [15, 24, 33, 42, 51]) {
      const sharedBoundary = segments.filter(
        ({ start, end }) => start.x === x && end.x === x && start.z === 0 && end.z === 8,
      )
      expect(sharedBoundary).toHaveLength(1)
    }
  })
})

describe('floor icons', () => {
  it('uses icons instead of labels for stairs', () => {
    const stairs = floorPlans.flatMap(({ areas }) => areas.filter(({ kind }) => kind === 'stairs'))
    const classroom = floorPlans.flatMap(({ areas }) => areas).find(({ kind }) => kind === 'room')

    expect(stairs).not.toHaveLength(0)
    expect(classroom).toBeDefined()
    expect(
      stairs.every(
        ({ icons, label, w, d }) =>
          icons?.join(',') === 'stairs,elevator' &&
          !label &&
          w === classroom?.w &&
          d === classroom?.d,
      ),
    ).toBe(true)
  })

  it('places the mens toilet on the left for 2F and 3F and on the right for 4F', () => {
    for (const floor of [2, 3, 4]) {
      const plan = floorPlans.find((candidate) => candidate.floor === floor)
      expect(plan).toBeDefined()
      // 同じ z では x が大きい区画ほど、現在の投影上で画面左に表示される
      const [screenLeft, screenRight] = plan!.areas
        .filter(({ kind }) => kind === 'toilet')
        .sort((left, right) => right.x - left.x)

      expect(screenLeft?.icons).toEqual([floor === 4 ? 'toilet-women' : 'toilet-men'])
      expect(screenRight?.icons).toEqual([floor === 4 ? 'toilet-men' : 'toilet-women'])
      expect(screenLeft?.label).toBeUndefined()
      expect(screenRight?.label).toBeUndefined()
    }
  })
})

describe('classroom layout', () => {
  it('uses one width for every classroom and leaves gaps beside toilets', () => {
    const classrooms = floorPlans.flatMap(({ areas }) =>
      areas.filter(({ kind }) => kind === 'room'),
    )
    expect(new Set(classrooms.map(({ w }) => w)).size).toBe(1)

    for (const floor of [2, 3, 4]) {
      const plan = floorPlans.find((candidate) => candidate.floor === floor)
      expect(plan).toBeDefined()
      const [leftToilet, rightToilet] = plan!.areas
        .filter(({ kind }) => kind === 'toilet')
        .sort((left, right) => left.x - right.x)
      const [leftClassroom, rightClassroom] = plan!.areas
        .filter(({ id }) => id.endsWith('07') || id.endsWith('08'))
        .sort((left, right) => left.x - right.x)
      const class2 = plan!.areas.find(({ id }) => id.endsWith('02'))
      const class5 = plan!.areas.find(({ id }) => id.endsWith('05'))
      const leftGap = leftClassroom!.x - (leftToilet!.x + leftToilet!.w)
      const rightGap = rightToilet!.x - (rightClassroom!.x + rightClassroom!.w)

      expect(leftGap).toBeGreaterThan(0)
      expect(rightGap).toBeCloseTo(leftGap)
      expect(leftClassroom!.x + leftClassroom!.w / 2).toBeCloseTo(class2!.x + class2!.w / 2)
      expect(rightClassroom!.x + rightClassroom!.w / 2).toBeCloseTo(class5!.x + class5!.w / 2)
    }
  })
})
