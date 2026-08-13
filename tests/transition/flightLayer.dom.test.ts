// @vitest-environment happy-dom

import type { IFlightFrame } from '@ts/interfaces'
import { createFlightLayer } from '@ts/transition/flightLayer'
import { beforeEach, describe, expect, it } from 'vitest'

const frame: IFlightFrame = {
  x: 10,
  y: 20,
  w: 300,
  h: 400,
  radius: 18,
  innerHeightPct: 120,
  innerOffsetYPct: -12
}

/** Stands in for the pswp root, which is where the flight belongs. */
function fakeRoot(): HTMLElement {
  const root = document.createElement('div')
  root.className = 'pswp'
  document.body.appendChild(root)
  return root
}

describe('createFlightLayer', () => {
  // Roots and detached layers outlive their test otherwise.
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts, paints and unmounts the promoted element', () => {
    const layer = createFlightLayer(() => fakeRoot())
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
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(frame, { kind: 'img', src: '/a.jpg' })
    layer.mount(frame, { kind: 'img', src: '/b.jpg' })
    const els = document.querySelectorAll('.arts-lightbox-flight')
    expect(els.length).toBe(1)
    expect(els[0]?.querySelector('img')?.getAttribute('src')).toBe('/b.jpg')
  })

  it('mounts inside the root, so the chrome paints over the travelling image', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(frame, { kind: 'img', src: '/a.jpg' })

    expect(root.querySelector('.arts-lightbox-flight')).not.toBeNull()
  })

  it('detaches to body so it can outlive the root being torn down', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(frame, { kind: 'img', src: '/a.jpg' })
    const el = root.querySelector('.arts-lightbox-flight')

    layer.detach()
    root.remove() // what pswp.destroy() does

    // Still alive, still painted, still carrying its final frame.
    expect(el?.parentElement).toBe(document.body)
    expect((el as HTMLElement).style.transform).toBe('translate(10px, 20px)')
  })

  it('leaves an already-detached layer alone', () => {
    const layer = createFlightLayer(() => fakeRoot())
    layer.mount(frame, { kind: 'img', src: '/a.jpg' })
    layer.detach()
    layer.detach()

    expect(document.querySelectorAll('.arts-lightbox-flight')).toHaveLength(1)
  })
})
