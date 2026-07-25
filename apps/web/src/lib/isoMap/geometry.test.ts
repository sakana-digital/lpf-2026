import { describe, expect, it } from 'vite-plus/test'
import { floorPlans } from '@/config/isoMap'
import { floorSegments } from './geometry'

describe('floorSegments', () => {
  it('draws the shared corridor and classroom boundary only once', () => {
    const secondFloor = floorPlans.find(({ floor }) => floor === 2)
    expect(secondFloor).toBeDefined()

    const sharedBoundary = floorSegments(secondFloor!).filter(
      ({ start, end }) => start.z === 8 && end.z === 8,
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
