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
    pan: { x: 0, y: 0 },
    bounds: { center: { x: 0, y: 0 } },
    setZoomLevel: vi.fn(),
    applyCurrentZoomPan: vi.fn(),
    _setResolution: vi.fn((r: number) => {
      slide.currentResolution = r
    }),
    // The fork re-derives zoomLevels from the SHARED options object.
    calculateSize: vi.fn(() => {
      slide.zoomLevels.initial =
        options.initialZoomLevel === 'fit' ? slide.zoomLevels.fit : slide.zoomLevels.fill
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

  it('stays detached under the classic model (initialLevel fit)', () => {
    // Stock zoom levels put secondary at ~3x fit — a deep zoom would trip
    // the threshold and collapse the classic range to the fill ceiling.
    const classicOpts = {
      ...DEFAULT_OPTIONS,
      zoom: { ...DEFAULT_OPTIONS.zoom, initialLevel: 'fit' as const }
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
    slide.zoomLevels.fill = slide.zoomLevels.fit // fit forced == fill
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fill')
    expect(slide.calculateSize).not.toHaveBeenCalled()
  })
})
