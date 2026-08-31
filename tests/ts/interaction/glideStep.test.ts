import { glideStep } from '@ts/interaction/glideStep'
import { describe, expect, it } from 'vitest'

describe('glideStep', () => {
  it('moves the configured fraction of the remaining distance', () => {
    expect(glideStep({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.25)).toEqual({ x: 25, y: 50 })
  })

  it('idles once both axes are within half a pixel', () => {
    expect(glideStep({ x: 0, y: 0 }, { x: 0.4, y: -0.4 }, 0.25)).toBeNull()
  })

  it('keeps stepping while either axis still has distance', () => {
    expect(glideStep({ x: 0, y: 0 }, { x: 0.4, y: 50 }, 0.5)).not.toBeNull()
    expect(glideStep({ x: 0, y: 0 }, { x: 50, y: 0.4 }, 0.5)).not.toBeNull()
  })

  it('converges without overshooting at smoothing below 1', () => {
    let pan = { x: 0, y: 0 }
    const target = { x: 100, y: 100 }
    for (let i = 0; i < 200; i++) {
      const next = glideStep(pan, target, 0.2)
      if (!next) {
        break
      }
      expect(next.x).toBeLessThanOrEqual(target.x)
      pan = next
    }
    expect(glideStep(pan, target, 0.2)).toBeNull()
  })

  it('lands exactly on the target at smoothing 1', () => {
    expect(glideStep({ x: 0, y: 0 }, { x: 100, y: -50 }, 1)).toEqual({ x: 100, y: -50 })
  })

  it('handles the negative pan space where PhotoSwipe bounds live', () => {
    expect(glideStep({ x: -100, y: -100 }, { x: -200, y: -300 }, 0.5)).toEqual({
      x: -150,
      y: -200
    })
  })
})
