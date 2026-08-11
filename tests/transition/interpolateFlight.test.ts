import type { IFlightSource, IFlightTarget } from '@ts/interfaces'
import { interpolateFlight } from '@ts/transition/interpolateFlight'
import { describe, expect, it } from 'vitest'

const from: IFlightSource = {
  rect: { x: 100, y: 200, w: 300, h: 400 },
  radius: 18,
  innerHeightPct: 120,
  innerOffsetYPct: -12,
  src: '/full.jpg'
}

const to: IFlightTarget = {
  rect: { x: 500, y: 100, w: 600, h: 800 },
  radius: 6
}

describe('interpolateFlight', () => {
  it('returns the source geometry at t=0', () => {
    const f = interpolateFlight(from, to, 0)
    expect(f).toEqual({
      x: 100,
      y: 200,
      w: 300,
      h: 400,
      radius: 18,
      innerHeightPct: 120,
      innerOffsetYPct: -12
    })
  })

  it('lands on the target with the parallax un-done at t=1', () => {
    const f = interpolateFlight(from, to, 1)
    expect(f).toEqual({
      x: 500,
      y: 100,
      w: 600,
      h: 800,
      radius: 6,
      innerHeightPct: 100,
      innerOffsetYPct: 0
    })
  })

  it('interpolates every channel linearly', () => {
    const f = interpolateFlight(from, to, 0.5)
    expect(f.x).toBe(300)
    expect(f.y).toBe(150)
    expect(f.w).toBe(450)
    expect(f.h).toBe(600)
    expect(f.radius).toBe(12)
    expect(f.innerHeightPct).toBe(110)
    expect(f.innerOffsetYPct).toBe(-6)
  })
})
