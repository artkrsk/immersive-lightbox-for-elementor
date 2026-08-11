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
    expect(defaults.imageClickAction).toBe('zoom')
    expect(defaults.wheelToZoom).toBe(false)
    expect(defaults.loop).toBe(true)

    const custom = mapToPswpOptions(
      mergeOptions({
        zoom: { imageClickAction: 'none', wheelToZoom: true },
        gallery: { loop: false }
      }),
      gallery,
      0
    )
    expect(custom.imageClickAction).toBe(false)
    expect(custom.wheelToZoom).toBe(true)
    expect(custom.loop).toBe(false)
  })

  it('maps next-on-click straight through to the native action', () => {
    const next = mapToPswpOptions(mergeOptions({ zoom: { imageClickAction: 'next' } }), gallery, 0)
    expect(next.imageClickAction).toBe('next')
  })
})
