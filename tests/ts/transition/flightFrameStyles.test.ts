import type { IFlightBox, IFlightFrame } from '@ts/interfaces'
import { flightFrameStyles } from '@ts/transition/flightFrameStyles'
import { describe, expect, it } from 'vitest'

/** The landing box: the flight's one and only size. */
const box: IFlightBox = { w: 600, h: 400 }

const frame = (over: Partial<IFlightFrame> = {}): IFlightFrame => ({
  x: 10,
  y: 20,
  w: 300,
  h: 200,
  radius: 8,
  innerWidthPct: 100,
  innerHeightPct: 100,
  innerOffsetXPct: 0,
  innerOffsetYPct: 0,
  ...over
})

describe('flightFrameStyles', () => {
  it('scales the landing box down to the frame rect, per axis', () => {
    const s = flightFrameStyles(frame(), box)
    expect(s.transform).toBe('translate(10px, 20px) scale(0.5, 0.5)')
    expect(flightFrameStyles(frame({ w: 300, h: 100 }), box).transform).toBe(
      'translate(10px, 20px) scale(0.5, 0.25)'
    )
  })

  it('is identity when the frame is the landing box', () => {
    const s = flightFrameStyles(frame({ x: 0, y: 0, w: 600, h: 400 }), box)
    expect(s.transform).toBe('translate(0px, 0px) scale(1, 1)')
    expect(s.innerTransform).toBe('translate(0px, 0px) scale(1, 1)')
    expect(s.borderRadius).toBe('8px / 8px')
  })

  it('counter-scales the radius so the corner reads as designed on screen', () => {
    // Half-size frame: a local radius twice as large paints as 8px.
    expect(flightFrameStyles(frame(), box).borderRadius).toBe('16px / 16px')
    // Per axis: squashed vertically, the vertical radius grows more.
    expect(flightFrameStyles(frame({ h: 100 }), box).borderRadius).toBe('16px / 32px')
  })

  it('an unoffset, unscaled inner media places the picture exactly in the frame', () => {
    expect(flightFrameStyles(frame(), box).innerTransform).toBe('translate(0px, 0px) scale(1, 1)')
  })

  /**
   * The page's img box is measured in FRAME terms; the picture covers it at
   * the landing box's aspect, centred. Both have to be re-expressed in the
   * outer's unscaled units, which the outer's per-axis scale divides out —
   * getting this wrong scales the parallax drift by the overscan.
   */
  it('re-expresses the page overscan and offset in the landing box units', () => {
    // 120% wide / 120% tall inner box, pushed -10% / -12% of the frame.
    const s = flightFrameStyles(
      frame({
        innerWidthPct: 120,
        innerHeightPct: 120,
        innerOffsetXPct: -10,
        innerOffsetYPct: -12
      }),
      box
    )
    // Inner box 360x240 at (-30, -24) in frame px; cover scale 360/600 = 0.6,
    // picture 360x240 lands flush in it; outer scale 0.5 divides out.
    expect(s.innerTransform).toBe('translate(-60px, -48px) scale(1.2, 1.2)')
  })

  it('covers a frame of another aspect with a centred, uniformly scaled picture', () => {
    // A 3:2 landing box shown through a square-ish inner box: cover picks the
    // larger axis and centres the overflow on the other.
    const s = flightFrameStyles(frame({ innerWidthPct: 100, innerHeightPct: 150 }), box)
    // Inner box 300x300; cover = max(300/600, 300/400) = 0.75 → picture 450x300,
    // centred: x = (300 - 450) / 2 = -75; divided by the outer scale 0.5.
    expect(s.innerTransform).toBe('translate(-150px, 0px) scale(1.5, 1.5)')
  })

  it('carries fractional geometry through unrounded', () => {
    const s = flightFrameStyles(frame({ x: 10.5, w: 300.25 }), box)
    expect(s.transform).toBe(`translate(10.5px, 20px) scale(${300.25 / 600}, 0.5)`)
  })

  it('survives a degenerate box without dividing by zero', () => {
    const s = flightFrameStyles(frame({ w: 0, h: 0 }), { w: 0, h: 0 })
    expect(s.transform).toBe('translate(10px, 20px) scale(1, 1)')
  })
})
