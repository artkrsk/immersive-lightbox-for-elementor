import { aimNeighbors, aimSlideAtPointer, isAboveFit } from '@ts/interaction/aimAtPointer'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'

type TSlide = NonNullable<PhotoSwipe['currSlide']>

/** bounds.min holds the LARGER translate and bounds.max the smaller — the
 *  names are inverted relative to their values (see mapPointerToPan). */
function slide({ zoom = 2, fit = 1 } = {}) {
  return {
    currZoomLevel: zoom,
    zoomLevels: { fit },
    bounds: { min: { x: 0, y: 0 }, max: { x: -400, y: -300 } },
    pan: { x: 0, y: 0 },
    applyCurrentZoomPan: vi.fn()
  } as unknown as TSlide
}

describe('isAboveFit', () => {
  it('is false at fit and below', () => {
    expect(isAboveFit(slide({ zoom: 1, fit: 1 }))).toBe(false)
    expect(isAboveFit(slide({ zoom: 0.5, fit: 1 }))).toBe(false)
  })

  it('absorbs float drift just above fit', () => {
    expect(isAboveFit(slide({ zoom: 1.0000001, fit: 1 }))).toBe(false)
  })

  it('is true once genuinely zoomed in', () => {
    expect(isAboveFit(slide({ zoom: 1.5, fit: 1 }))).toBe(true)
  })
})

describe('aimSlideAtPointer', () => {
  it('does nothing below fit, where pan is degenerate', () => {
    const s = slide({ zoom: 1, fit: 1 })
    aimSlideAtPointer(s, { x: 0.5, y: 0.5 })
    expect(s.pan).toEqual({ x: 0, y: 0 })
    expect(s.applyCurrentZoomPan).not.toHaveBeenCalled()
  })

  it('maps the pointer across the pan range and applies it', () => {
    const s = slide()
    aimSlideAtPointer(s, { x: 0.5, y: 0.5 })
    expect(s.pan).toEqual({ x: -200, y: -150 })
    expect(s.applyCurrentZoomPan).toHaveBeenCalled()
  })

  it('a pointer at the top left reveals the image top left', () => {
    const s = slide()
    aimSlideAtPointer(s, { x: 0, y: 0 })
    expect(s.pan).toEqual({ x: 0, y: 0 })
  })

  it('a pointer at the bottom right reveals the image bottom right', () => {
    const s = slide()
    aimSlideAtPointer(s, { x: 1, y: 1 })
    expect(s.pan).toEqual({ x: -400, y: -300 })
  })
})

describe('aimNeighbors', () => {
  it('aims every holder except the current slide', () => {
    const current = slide()
    const left = slide()
    const right = slide()
    const pswp = {
      currSlide: current,
      mainScroll: { itemHolders: [{ slide: left }, { slide: current }, { slide: right }] }
    } as unknown as PhotoSwipe

    aimNeighbors(pswp, { x: 1, y: 1 })

    expect(left.pan).toEqual({ x: -400, y: -300 })
    expect(right.pan).toEqual({ x: -400, y: -300 })
    expect(current.pan).toEqual({ x: 0, y: 0 })
  })

  it('skips holders with no slide yet', () => {
    const pswp = {
      currSlide: undefined,
      mainScroll: { itemHolders: [{ slide: undefined }] }
    } as unknown as PhotoSwipe
    expect(() => {
      aimNeighbors(pswp, { x: 0.5, y: 0.5 })
    }).not.toThrow()
  })
})
