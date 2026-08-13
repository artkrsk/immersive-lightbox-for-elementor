import { computeSlideRect } from '@ts/transition/computeSlideRect'
import { describe, expect, it } from 'vitest'

describe('computeSlideRect', () => {
  it('scales natural dimensions by zoom level at the pan offset', () => {
    const rect = computeSlideRect({
      pan: { x: 120, y: 40 },
      currZoomLevel: 0.5,
      width: 2400,
      height: 1600
    })
    expect(rect).toEqual({ x: 120, y: 40, w: 1200, h: 800 })
  })
})
