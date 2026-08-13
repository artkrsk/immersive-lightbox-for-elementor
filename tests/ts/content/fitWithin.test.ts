import { fitWithin } from '@ts/content/fitWithin'
import { describe, expect, it } from 'vitest'

describe('fitWithin', () => {
  it('contains by width when the area is taller than the aspect', () => {
    expect(fitWithin({ x: 1000, y: 800 }, 16 / 9)).toEqual({ w: 1000, h: 562.5 })
  })

  it('contains by height when the area is wider than the aspect', () => {
    expect(fitWithin({ x: 2000, y: 450 }, 16 / 9)).toEqual({ w: 800, h: 450 })
  })
})
