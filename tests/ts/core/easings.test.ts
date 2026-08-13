import { EASINGS } from '@ts/core/easings'
import { describe, expect, it } from 'vitest'

describe('EASINGS', () => {
  it('maps 0 to 0 and 1 to 1 for every curve', () => {
    for (const ease of Object.values(EASINGS)) {
      expect(ease(0)).toBeCloseTo(0, 12)
      expect(ease(1)).toBeCloseTo(1, 12)
    }
  })

  it('is symmetric at the midpoint for the inOut curves', () => {
    expect(EASINGS['power2.inOut'](0.5)).toBeCloseTo(0.5, 12)
    expect(EASINGS['power4.inOut'](0.5)).toBeCloseTo(0.5, 12)
    expect(EASINGS['expo.inOut'](0.5)).toBeCloseTo(0.5, 12)
    expect(EASINGS['circ.inOut'](0.5)).toBeCloseTo(0.5, 12)
  })

  it('expo.out starts fast and settles long', () => {
    expect(EASINGS['expo.out'](0.5)).toBeCloseTo(0.96875, 12)
    expect(EASINGS['expo.out'](0.1)).toBeGreaterThan(0.4)
  })
})
