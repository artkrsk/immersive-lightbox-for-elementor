import { createMomentumClassifier } from '@ts/interaction/createMomentumClassifier'
import { describe, expect, it } from 'vitest'

function wheel(deltaX: number, momentum?: boolean): WheelEvent {
  return { deltaX, deltaY: 0, momentum } as unknown as WheelEvent
}

describe('createMomentumClassifier', () => {
  it('the native momentum bit is ground truth in both directions', () => {
    const c = createMomentumClassifier()
    expect(c.classify(wheel(-40, true), 8, 0)).toBe('native')
    expect(c.classify(wheel(-40, false), 8, 0)).toBe(false)
  })

  it('a run of 3 same-sign non-increasing deltas at frame gaps classifies as decay', () => {
    const c = createMomentumClassifier()
    expect(c.classify(wheel(-50), 8, -1.2)).toBe(false) // establishes the window
    expect(c.classify(wheel(-40), 8, -1.1)).toBe(false)
    expect(c.classify(wheel(-32), 8, -1.0)).toBe(false)
    expect(c.classify(wheel(-25), 8, -0.9)).toBe('decay')
  })

  it('keeps the velocity captured where the decay run began', () => {
    const c = createMomentumClassifier()
    c.classify(wheel(-50), 8, -1.5) // run break → peak = -1.5
    c.classify(wheel(-40), 8, -1.2)
    c.classify(wheel(-32), 8, -1.0)
    expect(c.classify(wheel(-25), 8, -0.8)).toBe('decay')
    expect(c.peakVelocity()).toBe(-1.5)
  })

  it('a sign flip or a growing delta or a long gap resets the run', () => {
    const c = createMomentumClassifier()
    c.classify(wheel(-50), 8, 0)
    c.classify(wheel(-40), 8, 0)
    expect(c.classify(wheel(30), 8, 0)).toBe(false) // sign flip
    c.classify(wheel(28), 8, 0)
    expect(c.classify(wheel(40), 8, 0)).toBe(false) // growing delta resets
    c.classify(wheel(36), 8, 0)
    c.classify(wheel(30), 8, 0)
    expect(c.classify(wheel(25), 120, 0)).toBe(false) // gap too long
  })

  it('reset() clears the window and the peak', () => {
    const c = createMomentumClassifier()
    c.classify(wheel(-50), 8, -2)
    c.classify(wheel(-40), 8, -1.5)
    c.reset()
    expect(c.peakVelocity()).toBe(0)
    c.classify(wheel(-32), 8, -1)
    c.classify(wheel(-25), 8, -0.9)
    expect(c.classify(wheel(-20), 8, -0.8)).toBe(false) // run restarted
  })
})
