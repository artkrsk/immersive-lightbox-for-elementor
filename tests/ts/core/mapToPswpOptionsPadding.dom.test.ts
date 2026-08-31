// @vitest-environment happy-dom

import { DEFAULT_OPTIONS } from '@ts/constants/defaults'
import { mapToPswpOptions } from '@ts/core/mapToPswpOptions'
import type { IGallery } from '@ts/interfaces'
import { beforeEach, describe, expect, it } from 'vitest'

// The dom-env side of mapToPswpOptions: paddingFn reads the live document
// (admin bar overlap), so it cannot live in the node-env suite.
const gallery: IGallery = {
  key: 'g',
  slides: [{ type: 'image', src: '/a.jpg', width: 100, height: 100 }],
  elements: [],
  elementsByKey: new Map()
} as unknown as IGallery

describe('mapToPswpOptions paddingFn', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('pads the slide area top by the measured admin-bar overlap', () => {
    const bar = document.createElement('div')
    bar.id = 'wpadminbar'
    bar.getBoundingClientRect = () => ({ bottom: 32 }) as DOMRect
    document.body.appendChild(bar)

    const options = mapToPswpOptions(DEFAULT_OPTIONS, gallery, 0)
    const padding = options.paddingFn?.({ x: 1200, y: 800 }, {}, 0)

    expect(padding).toEqual({ top: 32, bottom: 0, left: 0, right: 0 })
  })

  it('is evaluated lazily — the overlap is read per call, not at build', () => {
    const options = mapToPswpOptions(DEFAULT_OPTIONS, gallery, 0)
    expect(options.paddingFn?.({ x: 1200, y: 800 }, {}, 0)?.top).toBe(0)

    const bar = document.createElement('div')
    bar.id = 'wpadminbar'
    bar.getBoundingClientRect = () => ({ bottom: 46 }) as DOMRect
    document.body.appendChild(bar)
    expect(options.paddingFn?.({ x: 1200, y: 800 }, {}, 0)?.top).toBe(46)
  })
})
