// @vitest-environment happy-dom

import type { IFlightFrame } from '@ts/interfaces'
import { createFlightLayer } from '@ts/transition/flightLayer'
import { describe, expect, it } from 'vitest'

const frame: IFlightFrame = {
  x: 10,
  y: 20,
  w: 300,
  h: 400,
  radius: 18,
  innerHeightPct: 120,
  innerOffsetYPct: -12
}

describe('createFlightLayer', () => {
  it('mounts, paints and unmounts the promoted element', () => {
    const layer = createFlightLayer()
    layer.mount(frame, { kind: 'img', src: '/thumb.jpg' })
    const el = document.querySelector<HTMLDivElement>('.arts-lightbox-flight')
    const img = el?.querySelector('img')
    expect(el).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/thumb.jpg')
    expect(el?.style.transform).toBe('translate(10px, 20px)')
    expect(el?.style.width).toBe('300px')
    expect(el?.style.borderRadius).toBe('18px')
    expect(img?.style.height).toBe('120%')
    // -12% of the frame = -10% of the (120%-tall) image's own height
    expect(img?.style.transform).toBe('translateY(-10%)')

    layer.paint({ ...frame, x: 50, radius: 6, innerHeightPct: 100, innerOffsetYPct: 0 })
    expect(el?.style.transform).toBe('translate(50px, 20px)')
    expect(el?.style.borderRadius).toBe('6px')
    expect(img?.style.transform).toBe('translateY(0%)')

    layer.unmount()
    expect(document.querySelector('.arts-lightbox-flight')).toBeNull()
  })

  it('replaces a stale element on re-mount', () => {
    const layer = createFlightLayer()
    layer.mount(frame, { kind: 'img', src: '/a.jpg' })
    layer.mount(frame, { kind: 'img', src: '/b.jpg' })
    const els = document.querySelectorAll('.arts-lightbox-flight')
    expect(els.length).toBe(1)
    expect(els[0]?.querySelector('img')?.getAttribute('src')).toBe('/b.jpg')
  })
})
