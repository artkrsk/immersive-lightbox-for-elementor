// @vitest-environment happy-dom

import { attachZoomCursor } from '@ts/interaction/zoomCursor'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function withSlide(fit: number, fill: number, curr = fill) {
  const pswp = fakePswp()
  pswp.element = document.createElement('div')
  const slide = {
    // The fill model: opens at fill, the click goes back to fit.
    zoomLevels: { fit, fill, initial: fill, secondary: fit },
    currZoomLevel: curr,
    isZoomable: () => true,
    data: {} as { dimsGuessed?: boolean }
  }
  pswp.currSlide = slide
  attachZoomCursor(pswp as unknown as PhotoSwipe)
  return { pswp, slide }
}

describe('attachZoomCursor', () => {
  it('drops the affordance when a dims upgrade collapses the zoom range', () => {
    // A dimension-less slide opens on interim dims (real zoom range), then
    // the natural upgrade recalculates levels for an image SMALLER than the
    // viewport: fit and fill both cap at natural — no meaningful zoom left.
    // The recalc dispatches zoomLevelsUpdate; the cursor must re-read there,
    // or it keeps promising zoom that means nothing.
    const { pswp, slide } = withSlide(0.33, 0.64)
    pswp.emit('zoomPanUpdate', {})
    expect(pswp.element?.className).toContain('arts-lightbox-can-zoom')

    slide.zoomLevels = { fit: 1, fill: 1, initial: 1, secondary: 1 }
    slide.currZoomLevel = 1
    pswp.emit('zoomLevelsUpdate', {})

    expect(pswp.element?.className).not.toContain('arts-lightbox-can-zoom')
    expect(pswp.element?.className).not.toContain('arts-lightbox-zoomed-in')
  })

  it('keeps the affordance for slides with real zoom range', () => {
    const { pswp } = withSlide(0.5, 0.8)
    pswp.emit('zoomLevelsUpdate', {})
    expect(pswp.element?.className).toContain('arts-lightbox-can-zoom')
    expect(pswp.element?.className).toContain('arts-lightbox-zoomed-in')
  })

  it('promises nothing while the dimensions are still guessed', () => {
    // The interim box has a range, but it is a placeholder's range: the
    // affordance would offer a zoom that vanishes the moment the real
    // dimensions arrive — the "+ on an image that cannot zoom" report.
    const { pswp, slide } = withSlide(0.47, 0.63)
    slide.data.dimsGuessed = true
    pswp.emit('zoomLevelsUpdate', {})
    expect(pswp.element?.className).not.toContain('arts-lightbox-can-zoom')
    expect(document.documentElement.className).not.toContain('arts-lightbox-can-zoom')

    // Naturals land on a genuinely zoomable image: the affordance appears.
    slide.data.dimsGuessed = false
    slide.zoomLevels = { fit: 0.5, fill: 1, initial: 1, secondary: 0.5 }
    pswp.emit('zoomLevelsUpdate', {})
    expect(pswp.element?.className).toContain('arts-lightbox-can-zoom')
  })

  it('mirrors the state onto <html>, where a cursor outside the root can read it', () => {
    // A cursor-follower glyph is drawn in that plugin's own element, appended
    // beside ours — the root's classes are unreachable from there, and its
    // rules are only resolved when the pointer CROSSES into an element, so a
    // payload swap would lag a zoom toggle made under a still pointer. Same
    // state on a shared ancestor lets CSS alone track the swap, live.
    const { pswp, slide } = withSlide(0.5, 0.8)
    pswp.emit('zoomLevelsUpdate', {})
    expect(document.documentElement.className).toContain('arts-lightbox-can-zoom')
    expect(document.documentElement.className).toContain('arts-lightbox-zoomed-in')

    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', {})
    expect(document.documentElement.className).toContain('arts-lightbox-can-zoom')
    expect(document.documentElement.className).not.toContain('arts-lightbox-zoomed-in')
  })

  it('promises the destination the moment a zoom starts, in both directions', () => {
    // The affordance is a promise about what the NEXT click does, so it has
    // to flip when the zoom is decided, not when it finishes. Read from the
    // live level it can only be symmetric by accident: the threshold sits at
    // the fit end, so zooming in crosses it on the first frame while zooming
    // out crosses it on the last — instant one way, a beat late the other.
    const { pswp, slide } = withSlide(0.5, 0.8)
    pswp.emit('zoomLevelsUpdate', {})
    expect(pswp.element?.className).toContain('arts-lightbox-zoomed-in')

    // Zoom out begins: level still at fill, destination is fit.
    pswp.emit('beforeZoomTo', { destZoomLevel: 0.5 })
    expect(pswp.element?.className).not.toContain('arts-lightbox-zoomed-in')
    expect(document.documentElement.className).not.toContain('arts-lightbox-zoomed-in')

    // Frames of the animation must not argue with the promise.
    slide.currZoomLevel = 0.72
    pswp.emit('zoomPanUpdate', {})
    expect(pswp.element?.className).not.toContain('arts-lightbox-zoomed-in')

    // Arrived: live readings own the state again.
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', {})
    expect(pswp.element?.className).not.toContain('arts-lightbox-zoomed-in')

    // A pinch past fit now reads live, with no stale promise in the way.
    slide.currZoomLevel = 0.6
    pswp.emit('zoomPanUpdate', {})
    expect(pswp.element?.className).toContain('arts-lightbox-zoomed-in')
  })

  it('drops a pending promise when the slide changes under it', () => {
    const { pswp, slide } = withSlide(0.5, 0.8)
    pswp.emit('beforeZoomTo', { destZoomLevel: 0.5 })
    expect(pswp.element?.className).not.toContain('arts-lightbox-zoomed-in')

    // A new slide arrives at fill; the abandoned zoom must not mute it.
    slide.currZoomLevel = 0.8
    pswp.emit('change', {})
    expect(pswp.element?.className).toContain('arts-lightbox-zoomed-in')
  })

  it('clears the mirrored state when the lightbox goes', () => {
    // The root is destroyed with the lightbox; <html> outlives it, and a
    // stale zoom class would style a glyph that no longer has a slide.
    const { pswp } = withSlide(0.5, 0.8)
    pswp.emit('zoomLevelsUpdate', {})
    expect(document.documentElement.className).toContain('arts-lightbox-can-zoom')

    pswp.emit('destroy', {})
    expect(document.documentElement.className).not.toContain('arts-lightbox-can-zoom')
    expect(document.documentElement.className).not.toContain('arts-lightbox-zoomed-in')
  })
})
