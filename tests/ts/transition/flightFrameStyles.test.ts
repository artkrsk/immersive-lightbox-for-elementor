import type { IFlightFrame } from '@ts/interfaces'
import { flightFrameStyles } from '@ts/transition/flightFrameStyles'
import { describe, expect, it } from 'vitest'

const frame = (over: Partial<IFlightFrame> = {}): IFlightFrame => ({
  x: 10,
  y: 20,
  w: 300,
  h: 200,
  radius: 8,
  innerHeightPct: 100,
  innerOffsetYPct: 0,
  ...over
})

describe('flightFrameStyles', () => {
  it('writes the frame box in pixels', () => {
    const s = flightFrameStyles(frame())
    expect(s.transform).toBe('translate(10px, 20px)')
    expect(s.width).toBe('300px')
    expect(s.height).toBe('200px')
    expect(s.borderRadius).toBe('8px')
  })

  it('sizes the inner media as a percentage of the frame', () => {
    expect(flightFrameStyles(frame({ innerHeightPct: 140 })).innerHeight).toBe('140%')
  })

  it('an unoffset inner media does not translate', () => {
    expect(flightFrameStyles(frame()).innerTransform).toBe('translateY(0%)')
  })

  /**
   * The offset is measured in FRAME terms but applied to an element sized as
   * a percentage of the frame, so it has to be re-expressed against that
   * height. Getting this wrong scales the parallax drift by the overscan.
   */
  it('re-expresses the offset against the inner height, not the frame', () => {
    // 20% of the frame, on media that is 140% of the frame → 20/140
    expect(
      flightFrameStyles(frame({ innerHeightPct: 140, innerOffsetYPct: -20 })).innerTransform
    ).toBe(`translateY(${(-20 / 140) * 100}%)`)
  })

  it('is identity when the media exactly fills the frame', () => {
    const s = flightFrameStyles(frame({ innerHeightPct: 100, innerOffsetYPct: -25 }))
    expect(s.innerTransform).toBe('translateY(-25%)')
  })

  it('carries fractional geometry through unrounded', () => {
    const s = flightFrameStyles(frame({ x: 10.5, w: 300.25 }))
    expect(s.transform).toBe('translate(10.5px, 20px)')
    expect(s.width).toBe('300.25px')
  })
})
