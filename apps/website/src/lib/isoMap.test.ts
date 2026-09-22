import { describe, expect, it } from 'vite-plus/test'
import { paintOrder, project, rotateBox, rotatePoint, textWidth, unionOutline } from './isoMap'

describe('project', () => {
  it('maps plan axes onto the 2:1 diagonals and z straight up', () => {
    expect(project(0, 0)).toEqual({ x: 0, y: 0 })
    expect(project(10, 0)).toEqual({ x: 10, y: 5 })
    expect(project(0, 10)).toEqual({ x: -10, y: 5 })
    expect(project(4, 4, 3)).toEqual({ x: 0, y: 1 })
  })
})

describe('paintOrder', () => {
  it('paints the box nearer the viewer last', () => {
    const far = { id: 'far', x: 0, y: 0, w: 5, h: 5 }
    const near = { id: 'near', x: 20, y: 20, w: 5, h: 5 }
    expect(paintOrder([near, far]).map((box) => box.id)).toEqual(['far', 'near'])
  })

  it('paints a box wholly behind a shorter neighbour first, however far it reaches', () => {
    const room = { id: 'room', x: 58, y: -54, w: 15.5, h: 7 }
    const tent = { id: 'tent', x: 57, y: -46, w: 6.5, h: 6 }
    expect(paintOrder([tent, room]).map((box) => box.id)).toEqual(['room', 'tent'])
  })

  it('leaves boxes that cannot hide each other in nearest-corner order', () => {
    const northEast = { id: 'ne', x: 12, y: 0, w: 5, h: 5 }
    const southWest = { id: 'sw', x: 0, y: 10, w: 5, h: 5 }
    expect(paintOrder([northEast, southWest]).map((box) => box.id)).toEqual(['sw', 'ne'])
  })
})

describe('unionOutline', () => {
  it('draws a lone box as its four edges', () => {
    const d = unionOutline([{ x: 0, y: 0, w: 2, h: 1 }], 0)
    expect(d.match(/M/g)).toHaveLength(4)
  })

  it('leaves out the edge two boxes share', () => {
    const boxes = [
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 2, y: 1, w: 1, h: 1 },
    ]
    const d = unionOutline(boxes, 0)
    // an L of six corners, its long west edge cut in two where the boxes meet
    expect(d.match(/M/g)).toHaveLength(8)
    const shared = `M${project(2, 1, 0).x},${project(2, 1, 0).y}L${project(2, 2, 0).x},${project(2, 2, 0).y}`
    expect(d).not.toContain(shared)
  })
})

describe('textWidth', () => {
  it('counts CJK as full width and Latin as narrow', () => {
    expect(textWidth('食堂')).toBe(2)
    expect(textWidth('EV')).toBeCloseTo(1.2)
  })
})

describe('rotateBox', () => {
  it('turns east onto north and comes back after four turns', () => {
    const box = { id: 'a', x: 0, y: 0, w: 10, h: 20 }
    expect(rotateBox(box, 1)).toEqual({ id: 'a', x: 0, y: -10, w: 20, h: 10 })
    expect(rotateBox(box, 4)).toEqual(box)
    expect(rotateBox(box, 0)).toBe(box)
  })
})

describe('rotatePoint', () => {
  it('turns the same way as the boxes', () => {
    expect(rotatePoint({ x: 1, y: 0 }, 1)).toEqual({ x: 0, y: -1 })
    expect(rotatePoint({ x: 0, y: -1 }, 1)).toEqual({ x: -1, y: -0 })
    expect(rotatePoint({ x: 3, y: 4 }, 4)).toEqual({ x: 3, y: 4 })
  })
})
