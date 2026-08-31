import { canSlideZoom } from '@ts/interaction/canSlideZoom'
import type Slide from '@ts/photoswipe/slide/slide'
import { describe, expect, it } from 'vitest'

function slide(over: {
  fit?: number
  fill?: number
  initial?: number
  secondary?: number
  zoomable?: boolean
  dimsGuessed?: boolean
}): Slide {
  // The fill model by default: opens at fill, the click goes to fit.
  const fit = 'fit' in over ? over.fit : 0.5
  const fill = 'fill' in over ? over.fill : 1
  return {
    // `in` rather than `??`, so a test can state an undefined level.
    zoomLevels: {
      fit,
      fill,
      initial: 'initial' in over ? over.initial : fill,
      secondary: 'secondary' in over ? over.secondary : fit
    },
    isZoomable: () => over.zoomable ?? true,
    data: { dimsGuessed: over.dimsGuessed }
  } as unknown as Slide
}

describe('canSlideZoom', () => {
  it('accepts a slide with a real range', () => {
    expect(canSlideZoom(slide({ fit: 0.5, fill: 1 }))).toBe(true)
  })

  it('rejects a range that collapsed onto natural size', () => {
    // An image smaller than the viewport: the fork caps both at 1, so the
    // click has nowhere to go.
    expect(canSlideZoom(slide({ fit: 1, fill: 1 }))).toBe(false)
  })

  it('rejects a range invented from guessed dimensions', () => {
    // Dimension-less slides open on an interim box big enough to look
    // zoomable. Believing that range is what made small images arrive
    // covering the screen and then snap when their naturals landed.
    expect(canSlideZoom(slide({ fit: 0.47, fill: 0.63, dimsGuessed: true }))).toBe(false)
  })

  it('rejects what the content type refuses to zoom', () => {
    // Video and html slides answer false regardless of their raw ratios —
    // a check two of the three call sites used to skip.
    expect(canSlideZoom(slide({ fit: 0.5, fill: 1, zoomable: false }))).toBe(false)
  })

  it('under the fit model, reads the range from where the click goes', () => {
    // Opens at fit; the click level is the only thing that says whether a
    // click does anything. Fill is irrelevant there — a small image still
    // has fill above fit while its click, capped at natural, stays put.
    expect(canSlideZoom(slide({ fit: 0.25, fill: 0.4, initial: 0.25, secondary: 0.75 }))).toBe(true)
    expect(canSlideZoom(slide({ fit: 1, fill: 1.4, initial: 1, secondary: 1 }))).toBe(false)
  })

  it('tolerates levels that have not been derived yet', () => {
    expect(canSlideZoom(slide({ fit: undefined as unknown as number }))).toBe(false)
  })
})
