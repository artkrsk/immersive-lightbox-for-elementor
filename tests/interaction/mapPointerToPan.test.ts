import { mapPointerToPan } from '@ts/interaction/mapPointerToPan'
import { describe, expect, it } from 'vitest'

// PhotoSwipe pan-bounds naming: max = left/top-most translate value (image
// shifted to reveal its left/top edge), min = right/bottom-most.
const bounds = {
  max: { x: 0, y: 0 },
  min: { x: -400, y: -300 }
}

describe('mapPointerToPan', () => {
  it('maps the pointer linearly across the pan range', () => {
    expect(mapPointerToPan({ x: 0, y: 0 }, bounds)).toEqual({ x: 0, y: 0 })
    expect(mapPointerToPan({ x: 1, y: 1 }, bounds)).toEqual({ x: -400, y: -300 })
    expect(mapPointerToPan({ x: 0.5, y: 0.5 }, bounds)).toEqual({ x: -200, y: -150 })
  })

  it('is constant when the image fits (degenerate bounds)', () => {
    const fits = { max: { x: 50, y: 20 }, min: { x: 50, y: 20 } }
    expect(mapPointerToPan({ x: 0.1, y: 0.9 }, fits)).toEqual({ x: 50, y: 20 })
  })

  it('clamps pointer input outside 0..1', () => {
    expect(mapPointerToPan({ x: -0.5, y: 1.5 }, bounds)).toEqual({ x: 0, y: -300 })
  })
})
