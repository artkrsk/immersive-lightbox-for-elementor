import { mapPointerToPan } from '@ts/interaction/mapPointerToPan'
import { describe, expect, it } from 'vitest'

// PhotoSwipe pan-bounds as observed live: min = larger translate (0, reveals
// the image's top/left), max = smaller/negative (reveals bottom/right).
const bounds = {
  max: { x: -400, y: -300 },
  min: { x: 0, y: 0 }
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

  it('matches the live-engine orientation: pointer at top reveals the image top', () => {
    // Captured from the playground: tall image at zoom 1, viewport 1058 high.
    const live = { max: { x: 578, y: -1342 }, min: { x: 578, y: 0 } }
    expect(mapPointerToPan({ x: 0.5, y: 0 }, live)).toEqual({ x: 578, y: 0 })
    expect(mapPointerToPan({ x: 0.5, y: 1 }, live)).toEqual({ x: 578, y: -1342 })
  })
})
