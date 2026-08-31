import { DEFAULT_OPTIONS } from '@ts/constants'
import { mapToPswpOptions } from '@ts/core/mapToPswpOptions'
import { mergeOptions } from '@ts/core/mergeOptions'
import type { IGallery } from '@ts/interfaces'
import { describe, expect, it } from 'vitest'

const gallery: IGallery = {
  id: 'g',
  slides: [
    { key: 'a', type: 'image', src: '/a.jpg', width: 1200, height: 800, msrc: '/a-t.jpg' },
    { key: 'b', type: 'image', src: '/b.jpg', caption: 'B side' },
    { key: 'c', type: 'video', src: 'https://youtu.be/dQw4w9WgXcQ', videoEmbed: 'youtube' }
  ],
  elementsByKey: new Map()
}

describe('mapToPswpOptions', () => {
  it('gives a guessed dimension-less image slide a neutral interim box', () => {
    const bare: IGallery = {
      id: 'g2',
      slides: [{ key: 'x', type: 'image', src: '/x.png', dimsGuessed: true }],
      elementsByKey: new Map()
    }
    const opts = mapToPswpOptions(DEFAULT_OPTIONS, bare, 0)
    const slide = (opts.dataSource as Array<Record<string, unknown>>)[0]
    // Square and comfortably above any viewport: pswp math works from frame
    // one, and the loadComplete upgrade corrects box AND aspect.
    expect(slide?.width).toBe(3200)
    expect(slide?.height).toBe(3200)
  })

  it('maps slides and neutralizes the built-ins we replace', () => {
    const opts = mapToPswpOptions(DEFAULT_OPTIONS, gallery, 1)
    expect(opts.index).toBe(1)
    expect(opts.showHideAnimationType).toBe('none')
    expect(opts.bgOpacity).toBe(0)
    const dataSource = opts.dataSource as Array<Record<string, unknown>>
    expect(dataSource.length).toBe(3)
    expect(dataSource[0]?.src).toBe('/a.jpg')
    expect(dataSource[0]?.width).toBe(1200)
    expect(dataSource[0]?.msrc).toBe('/a-t.jpg')
    expect(dataSource[2]?.type).toBe('video')
    // our UI replaces the stock elements regardless of our ui options
    expect(opts.counter).toBe(false)
    expect(opts.zoom).toBe(false)
    expect(opts.arrowPrev).toBe(false)
    expect(opts.arrowNext).toBe(false)
    expect(opts.close).toBe(false)
    // all close and nav paths route through the engine api
    expect(opts.escKey).toBe(false)
    expect(opts.arrowKeys).toBe(false)
    expect(opts.bgClickAction).toBe(false)
    expect(opts.closeOnVerticalDrag).toBe(false)
    expect(opts.pinchToClose).toBe(false)
  })

  it('maps zoom and gallery behavior options', () => {
    const defaults = mapToPswpOptions(DEFAULT_OPTIONS, gallery, 0)
    expect(defaults.wheelToZoom).toBe(false)
    expect(defaults.loop).toBe(true)

    const custom = mapToPswpOptions(
      mergeOptions({ zoom: { wheelToZoom: true }, gallery: { loop: false } }),
      gallery,
      0
    )
    expect(custom.wheelToZoom).toBe(true)
    expect(custom.loop).toBe(false)
  })

  it('always hands the image click to zoom, never to close', () => {
    // The fork's default is 'zoom-or-close': a click on a slide that cannot
    // zoom would dismiss the lightbox. toggleZoom on such a slide is a no-op,
    // which is what a click should be when there is nothing to toggle.
    for (const mode of ['fill', 'fit', 'off'] as const) {
      expect(mapToPswpOptions(mergeOptions({ zoom: { mode } }), gallery, 0).imageClickAction).toBe(
        'zoom'
      )
    }
  })

  it('fill mode opens at fill, toggles to fit, and caps at fill', () => {
    const fill = mapToPswpOptions(DEFAULT_OPTIONS, gallery, 0)
    expect(fill.initialZoomLevel).toBe('fill')
    expect(fill.secondaryZoomLevel).toBe('fit')
    expect(fill.maxZoomLevel).toBe('fill')
  })

  it('fit mode derives one level from the fitted size, for click and pinch alike', () => {
    const levels = (fit: number, over: { level?: number } = {}) => {
      const opts = mapToPswpOptions(mergeOptions({ zoom: { mode: 'fit', ...over } }), gallery, 0)
      const z = { fit, elementSize: { x: 1000, y: 800 } } as unknown as Parameters<
        Extract<typeof opts.secondaryZoomLevel, (z: never) => number>
      >[0]
      const secondary = opts.secondaryZoomLevel
      const max = opts.maxZoomLevel
      if (typeof secondary !== 'function' || typeof max !== 'function') {
        throw new Error('fit mode must resolve the levels from the slide')
      }
      return { initial: opts.initialZoomLevel, secondary: secondary(z), max: max(z) }
    }

    // The default reproduces the stock 3x click; the ceiling is the same
    // number — one answer to "how far in does zoom go".
    expect(levels(0.25)).toEqual({ initial: 'fit', secondary: 0.75, max: 0.75 })
    // Never past the image's own pixels, by click or by pinch.
    expect(levels(0.5)).toEqual({ initial: 'fit', secondary: 1, max: 1 })
    // A multiple of fit.
    const custom = levels(0.2, { level: 2 })
    expect(custom.secondary).toBeCloseTo(0.4)
    expect(custom.max).toBeCloseTo(0.4)
  })

  it('off mode opens at fit', () => {
    const off = mapToPswpOptions(mergeOptions({ zoom: { mode: 'off' } }), gallery, 0)
    expect(off.initialZoomLevel).toBe('fit')
  })
})
