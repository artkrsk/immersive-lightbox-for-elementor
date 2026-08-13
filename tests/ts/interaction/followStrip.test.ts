import { followStrip, indexShiftFor } from '@ts/interaction/followStrip'
import { describe, expect, it } from 'vitest'

const base = { x: 0, currX: 0, slideWidth: 1000, velocityX: 0, dt: 10 }

describe('followStrip', () => {
  it('follows the delta 1:1 in the opposite direction', () => {
    expect(followStrip({ ...base, deltaX: -80 }).nextX).toBe(80)
    expect(followStrip({ ...base, deltaX: 80 }).nextX).toBe(-80)
  })

  it('clamps to one slide either side of the current index', () => {
    expect(followStrip({ ...base, deltaX: -5000 }).nextX).toBe(1000)
    expect(followStrip({ ...base, deltaX: 5000 }).nextX).toBe(-1000)
  })

  it('clamps around currX, not around zero', () => {
    const at = { ...base, x: 3000, currX: 3000 }
    expect(followStrip({ ...at, deltaX: -5000 }).nextX).toBe(4000)
    expect(followStrip({ ...at, deltaX: 5000 }).nextX).toBe(2000)
  })

  it('blends 30% of the new sample into the carried velocity', () => {
    // travelled 100px in 10ms = 10px/ms, from a standstill
    expect(followStrip({ ...base, deltaX: -100 }).velocityX).toBeCloseTo(3)
    // same sample, now carrying 10px/ms: 10*0.7 + 10*0.3
    expect(followStrip({ ...base, deltaX: -100, velocityX: 10 }).velocityX).toBeCloseTo(10)
  })

  it('reports zero velocity when the clamp blocks all travel', () => {
    const pinned = { ...base, x: 1000, currX: 0 }
    expect(followStrip({ ...pinned, deltaX: -500 }).velocityX).toBe(0)
  })
})

describe('indexShiftFor', () => {
  it('holds while the strip is short of a full slide', () => {
    expect(indexShiftFor(500, 0, 1000)).toBe(0)
    expect(indexShiftFor(-998, 0, 1000)).toBe(0)
  })

  it('commits forward when the strip fully reached the next slide', () => {
    expect(indexShiftFor(-1000, 0, 1000)).toBe(1)
  })

  it('commits backward when the strip fully reached the previous slide', () => {
    expect(indexShiftFor(1000, 0, 1000)).toBe(-1)
  })

  it('commits one pixel early, matching the strip settle tolerance', () => {
    expect(indexShiftFor(999, 0, 1000)).toBe(-1)
  })

  it('measures against currX, not zero', () => {
    expect(indexShiftFor(4000, 3000, 1000)).toBe(-1)
    expect(indexShiftFor(3500, 3000, 1000)).toBe(0)
  })
})
