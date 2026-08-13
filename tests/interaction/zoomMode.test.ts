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

  it('flips back to fill and re-derives again', () => {
    const { pswp, slide } = setup()
    slide.currZoomLevel = 0.5
    pswp.emit('zoomPanUpdate', { slide })
    slide.currZoomLevel = 1 // pinched back in to fill
    pswp.emit('zoomPanUpdate', { slide })
    expect(pswp.options.initialZoomLevel).toBe('fill')
    expect(slide.zoomLevels.initial).toBe(1)
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
