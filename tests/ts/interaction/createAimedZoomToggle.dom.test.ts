// @vitest-environment happy-dom

import { createAimedZoomToggle } from '@ts/interaction/createAimedZoomToggle'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function setup(
  over: {
    fit?: number
    fill?: number
    initial?: number
    secondary?: number
    current?: number
    dimsGuessed?: boolean
  } = {}
) {
  // `dispatch` locally rather than in the shared helper: the toggle announces
  // its destination through it, and nothing else in this suite needs it.
  const pswp = Object.assign(fakePswp(), { dispatch: vi.fn() })
  // The fill model unless told otherwise: opens at fill, the click goes to fit.
  const fit = over.fit ?? 0.5
  const fill = over.fill ?? 1
  const slide = {
    zoomLevels: {
      fit,
      fill,
      initial: over.initial ?? fill,
      secondary: over.secondary ?? fit
    },
    currZoomLevel: over.current ?? over.initial ?? fill,
    isZoomable: () => true,
    data: { dimsGuessed: over.dimsGuessed },
    bounds: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
    pan: { x: 0, y: 0 },
    setZoomLevel: vi.fn(),
    applyCurrentZoomPan: vi.fn()
  }
  pswp.currSlide = slide as unknown as NonNullable<PhotoSwipe['currSlide']>
  const onStart = vi.fn()
  const zoom = createAimedZoomToggle(pswp as unknown as PhotoSwipe, { x: 0.5, y: 0.5 }, onStart)
  return { pswp, slide, zoom, onStart }
}

describe('createAimedZoomToggle', () => {
  it('toggles a slide with a real range', () => {
    const { zoom, onStart } = setup()
    zoom.toggle()
    expect(onStart).toHaveBeenCalled()
    zoom.cancel()
  })

  it('zooms in to where the model says a click lands, not always to fill', () => {
    // Fill model: out from fill to fit.
    const fillModel = setup()
    fillModel.zoom.toggle()
    expect(fillModel.pswp.dispatch).toHaveBeenCalledWith(
      'beforeZoomTo',
      expect.objectContaining({ destZoomLevel: 0.5 })
    )
    fillModel.zoom.cancel()

    // Fit model: in from fit to the click level, which sits below fill.
    const fitModel = setup({ fit: 0.25, fill: 1, initial: 0.25, secondary: 0.75 })
    fitModel.zoom.toggle()
    expect(fitModel.pswp.dispatch).toHaveBeenCalledWith(
      'beforeZoomTo',
      expect.objectContaining({ destZoomLevel: 0.75 })
    )
    fitModel.zoom.cancel()
  })

  it('refuses a range that collapsed onto natural size', () => {
    const { zoom, onStart } = setup({ fit: 1, fill: 1 })
    zoom.toggle()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('refuses while the dimensions are still guessed', () => {
    // Clicking during the interim window would animate toward a level
    // derived from a placeholder box that is about to be replaced.
    const { zoom, onStart } = setup({ fit: 0.47, fill: 0.63, dimsGuessed: true })
    zoom.toggle()
    expect(onStart).not.toHaveBeenCalled()
  })
})
