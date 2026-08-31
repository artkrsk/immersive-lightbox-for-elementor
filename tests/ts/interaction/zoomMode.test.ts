import { DEFAULT_OPTIONS } from '@ts/constants'
import { attachZoomMode } from '@ts/interaction/zoomMode'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function slideStub(options: { initialZoomLevel?: unknown }) {
  const slide = {
    currZoomLevel: 1,
    currentResolution: 0,
    zoomLevels: { fit: 0.5, fill: 1, initial: 1, secondary: 0.5 },
    isZoomable: () => true,
    data: {} as { dimsGuessed?: boolean },
    pan: { x: 0, y: 0 },
    bounds: { center: { x: 0, y: 0 } },
    setZoomLevel: vi.fn(),
    applyCurrentZoomPan: vi.fn(),
    _setResolution: vi.fn((r: number) => {
      slide.currentResolution = r
    }),
    // The fork re-derives zoomLevels from the SHARED options object — the
    // session mode writes initial and secondary as a pair (fill/fit or
    // fit/fill), so both move.
    calculateSize: vi.fn(() => {
      const toFit = options.initialZoomLevel === 'fit'
      slide.zoomLevels.initial = toFit ? slide.zoomLevels.fit : slide.zoomLevels.fill
      slide.zoomLevels.secondary = toFit ? slide.zoomLevels.fill : slide.zoomLevels.fit
    })
  }
  return slide
}

const NATURAL = 2000

/**
 * slideStub plus the fork's actual render model: `box` is sticky at the last
 * _setResolution, `scale` sticky at the last applyCurrentZoomPan, and — as in
 * the fork — the transform is written BEFORE zoomPanUpdate is dispatched, so
 * listeners see a scale that still divides by the pre-flip basis.
 */
function renderingSlideStub(
  pswp: ReturnType<typeof fakePswp>,
  options: { initialZoomLevel?: unknown }
) {
  const base = slideStub(options)
  const basis = () => base.currentResolution || base.zoomLevels.initial
  const slide = Object.assign(base, {
    box: NATURAL * basis(),
    scale: 1,
    rendered: () => slide.box * slide.scale
  })
  slide._setResolution = vi.fn((r: number) => {
    base.currentResolution = r
    slide.box = NATURAL * basis()
  })
  slide.applyCurrentZoomPan = vi.fn(() => {
    slide.scale = base.currZoomLevel / basis()
    pswp.emit('zoomPanUpdate', { slide })
  })
  return slide
}

function renderingSetup() {
  const pswp = fakePswp() as ReturnType<typeof fakePswp> & {
    options: { initialZoomLevel?: unknown; secondaryZoomLevel?: unknown }
  }
  pswp.options = { initialZoomLevel: 'fill', secondaryZoomLevel: 'fit' }
  const slide = renderingSlideStub(pswp, pswp.options)
  pswp.currSlide = slide
  attachZoomMode(pswp as unknown as PhotoSwipe, DEFAULT_OPTIONS)
  return { pswp, slide }
}

function setup() {
  const pswp = fakePswp() as ReturnType<typeof fakePswp> & {
    options: { initialZoomLevel?: unknown; secondaryZoomLevel?: unknown }
  }
  pswp.options = { initialZoomLevel: 'fill', secondaryZoomLevel: 'fit' }
  const slide = slideStub(pswp.options)
  pswp.currSlide = slide
  attachZoomMode(pswp as unknown as PhotoSwipe, DEFAULT_OPTIONS)
  return { pswp, slide }
}

describe('attachZoomMode', () => {
  it('re-derives the CURRENT slide zoom levels at the mode flip', () => {
    // The fork's touch pinch-end (correctZoomPan) springs back to the
    // slide's CACHED zoomLevels.initial. Without a recalc at the flip,
    // every pinch-out snapped back to fill on finger lift.
    const { pswp, slide } = setup()
    slide.currZoomLevel = 0.5 // pinched out to fit
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fit')
    expect(slide.calculateSize).toHaveBeenCalled()
    expect(slide.zoomLevels.initial).toBe(0.5) // cache agrees with the mode
  })

  it('pins the resolution on the implicit-basis first interaction only', () => {
    // With currentResolution 0 the fork renders on `initial` as the basis —
    // flipping `initial` mid-gesture swapped the basis under a fill-sized
    // element (one oversized out-of-bounds paint). The flip must make the
    // basis explicit; once a real resolution exists it is never touched.
    const { pswp, slide } = setup()
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    expect(slide._setResolution).toHaveBeenCalledWith(0.5)

    slide.currZoomLevel = 1 // pinch back in — resolution now real
    pswp.emit('zoomPanUpdate', { slide })
    expect(slide._setResolution).toHaveBeenCalledTimes(1)
  })

  it('never ends a frame with the box and the transform on different bases', () => {
    // The fork renders in two halves that must agree: the content box is
    // `width * (currentResolution || zoomLevels.initial)`, the container
    // transform divides the live zoom by that same basis. The browser paints
    // whatever the synchronous stack ends in, so a flip that resizes the box
    // without rewriting the transform paints one frame at fit/fill of the
    // right size, anchored top-left (transform-origin is 0 0).
    const { slide } = renderingSetup()
    slide.currZoomLevel = 0.5 // the clock tick that crosses the fit threshold
    slide.applyCurrentZoomPan()
    expect(slide.rendered()).toBeCloseTo(NATURAL * slide.currZoomLevel)
  })

  it('leaves an already-explicit basis untouched — no resize, no repaint', () => {
    const { pswp, slide } = setup()
    slide.currentResolution = 1 // a real resolution already exists
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    expect(slide._setResolution).not.toHaveBeenCalled()
    expect(slide.applyCurrentZoomPan).not.toHaveBeenCalled()
  })

  it('flips back to fill and re-derives again', () => {
    const { pswp, slide } = setup()
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    slide.currZoomLevel = 1 // pinched back in to fill
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fill')
    expect(slide.zoomLevels.initial).toBe(1)
  })

  it('stays detached under the classic model (zoom mode fit)', () => {
    // The click level sits at ~3x fit — a deep zoom would trip the
    // threshold and collapse the classic range to the fill ceiling.
    const classicOpts = {
      ...DEFAULT_OPTIONS,
      zoom: { ...DEFAULT_OPTIONS.zoom, mode: 'fit' as const }
    }
    const pswp = fakePswp() as ReturnType<typeof fakePswp> & {
      options: { initialZoomLevel?: unknown }
    }
    pswp.options = { initialZoomLevel: 'fit' }
    const slide = slideStub(pswp.options)
    pswp.currSlide = slide
    attachZoomMode(pswp as unknown as PhotoSwipe, classicOpts)
    slide.currZoomLevel = 1 // past fill — would flip the session mode
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fit') // untouched
  })

  it('never flips on degenerate ranges (fit-only video slides)', () => {
    const { pswp, slide } = setup()
    // The zoom policy collapses every level onto fit.
    slide.zoomLevels.fill = slide.zoomLevels.fit
    slide.zoomLevels.initial = slide.zoomLevels.fit
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fill')
    expect(slide.calculateSize).not.toHaveBeenCalled()
  })

  it('shows a slide that cannot zoom at fit, whatever the session prefers', () => {
    // A small image in a gallery of big ones: fit and fill collapsed onto
    // natural size, so "fill" means nothing here. Applying the session
    // preference anyway is what made it arrive looking zoomed.
    const { pswp, slide } = setup()
    slide.zoomLevels.fill = slide.zoomLevels.fit
    slide.zoomLevels.initial = slide.zoomLevels.fit
    slide.currZoomLevel = 1
    pswp.emit('change', {})
    expect(slide.setZoomLevel).toHaveBeenCalledWith(slide.zoomLevels.fit)
  })

  it('shows a guessed-dims slide at fit — its range is fiction until load', () => {
    // The interim box makes a small image look zoomable. Believing it meant
    // the slide painted covering the screen and snapped when the naturals
    // landed, which is the flicker this whole change exists to remove.
    const { pswp, slide } = setup()
    slide.data.dimsGuessed = true
    slide.zoomLevels.fit = 0.47
    slide.zoomLevels.fill = 0.63
    slide.currZoomLevel = 0.63
    pswp.emit('change', {})
    expect(slide.setZoomLevel).toHaveBeenCalledWith(0.47)
  })

  it('never lets a fictional range write the session preference', () => {
    const { pswp, slide } = setup()
    slide.currZoomLevel = 0.5 // user zooms out: preference becomes fit
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fit')

    slide.data.dimsGuessed = true
    slide.currZoomLevel = 1 // the interim box's "fill" — not a user choice
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fit')
  })

  it('re-arms the preference on the next slide that can honor it', () => {
    // Passing a slide that cannot zoom must not cost the session its zoom:
    // the preference is the user's, and the small slide simply could not
    // borrow it.
    const { pswp, slide } = setup()
    slide.zoomLevels.fill = slide.zoomLevels.fit // non-zoomable arrival
    slide.zoomLevels.initial = slide.zoomLevels.fit
    pswp.emit('change', {})
    expect(slide.setZoomLevel).toHaveBeenLastCalledWith(slide.zoomLevels.fit)

    slide.zoomLevels.fit = 0.5 // next slide has a real range again
    slide.zoomLevels.fill = 1
    slide.zoomLevels.initial = 1
    slide.currZoomLevel = 0.5
    pswp.emit('change', {})
    expect(slide.setZoomLevel).toHaveBeenLastCalledWith(1)
  })

  it('re-syncs when the naturals land and change the verdict', () => {
    // loadComplete corrects the dims long after the slide painted; the mode
    // has to be re-applied there or the slide keeps the interim decision.
    const { pswp, slide } = setup()
    slide.data.dimsGuessed = true
    slide.zoomLevels.fit = 0.47
    slide.zoomLevels.fill = 0.63
    pswp.emit('change', {})

    slide.data.dimsGuessed = false // upgrade lands, real range
    slide.zoomLevels.fit = 0.5
    slide.zoomLevels.fill = 1
    slide.currZoomLevel = 0.47
    pswp.emit('zoomLevelsUpdate', { zoomLevels: slide.zoomLevels })
    expect(slide.setZoomLevel).toHaveBeenLastCalledWith(1)
  })
})
