// @vitest-environment happy-dom

import type { IFlightBox, IFlightExtra, IFlightFrame } from '@ts/interfaces'
import { createFlightLayer } from '@ts/transition/flightLayer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'

const frame: IFlightFrame = {
  t: 0,
  x: 10,
  y: 20,
  w: 300,
  h: 400,
  radius: 18,
  innerWidthPct: 120,
  innerHeightPct: 120,
  innerOffsetXPct: -10,
  innerOffsetYPct: -12
}

const box: IFlightBox = { w: 600, h: 400 }

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
    vi.restoreAllMocks()
  })

  it('mounts a box of the landing size, flies it on the compositor and unmounts', () => {
    const layer = createFlightLayer(() => fakeRoot())
    layer.mount(box, { src: '/thumb.jpg' })
    const el = document.querySelector<HTMLDivElement>('.arts-lightbox-flight')
    const img = el?.querySelector('img')
    expect(el).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('/thumb.jpg')
    // The only size the box ever has — the raster the compositor keeps.
    expect(el?.style.width).toBe('600px')
    expect(el?.style.height).toBe('400px')

    layer.fly(() => frame, 800, 'power2.inOut')
    // Two transforms (outer box, inner picture) plus the radius, each its own
    // animation so the transforms stay compositable.
    expect(el?.getAnimations()).toHaveLength(2)
    expect(img?.getAnimations()).toHaveLength(1)

    layer.unmount()
    expect(document.querySelector('.arts-lightbox-flight')).toBeNull()
  })

  it('re-aims a flight in progress by swapping keyframes, keeping its time', () => {
    const setKeyframes = vi.fn()
    const animate = vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(
      () =>
        ({
          cancel: vi.fn(),
          finished: Promise.resolve(),
          effect: { setKeyframes }
        }) as unknown as Animation
    )
    const layer = createFlightLayer(() => fakeRoot())
    layer.mount(box, { src: '/a.jpg' })
    layer.fly(() => frame, 800, 'power2.inOut')
    expect(animate).toHaveBeenCalledTimes(3)

    layer.retarget(() => ({ ...frame, x: 99 }))

    expect(setKeyframes).toHaveBeenCalledTimes(3)
    expect(animate).toHaveBeenCalledTimes(3)
  })

  it('a fresh fly cancels the one in progress', () => {
    const cancel = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(
      () => ({ cancel, finished: Promise.resolve(), effect: null }) as unknown as Animation
    )
    const layer = createFlightLayer(() => fakeRoot())
    layer.mount(box, { src: '/a.jpg' })
    layer.fly(() => frame, 800, 'power2.inOut')
    layer.fly(() => frame, 800, 'power2.inOut')

    expect(cancel).toHaveBeenCalledTimes(3)
  })

  it('mounts the extras after the media and animates each on its own tracks', () => {
    const animate = vi
      .spyOn(HTMLElement.prototype, 'animate')
      .mockImplementation(
        () =>
          ({ cancel: vi.fn(), finished: Promise.resolve(), effect: null }) as unknown as Animation
      )
    const caption = document.createElement('b')
    caption.id = 'cap'
    caption.textContent = 'Garden Curve'
    caption.setAttribute('data-arts-lightbox-fly', 'caption')
    const extras: IFlightExtra[] = [
      {
        kind: 'veil',
        element: document.createElement('i'),
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        width: 300,
        height: 400,
        hover: false,
        opacity: 0.3,
        styles: { backgroundColor: 'rgb(35, 35, 35)' }
      },
      {
        kind: 'caption',
        element: caption,
        x: 0.1,
        y: 0.85,
        w: 0.5,
        h: 0.1,
        width: 150,
        height: 40,
        hover: true,
        opacity: 1,
        styles: { color: 'rgb(255, 255, 255)' }
      }
    ]
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' }, extras)
    const el = root.querySelector('.arts-lightbox-flight') as HTMLElement
    const children = [...el.children].map((child) => child.className)
    expect(children).toEqual([
      'arts-lightbox-flight__media',
      'arts-lightbox-flight__veil',
      'arts-lightbox-flight__extra arts-lightbox-flight__extra_hover'
    ])
    const veil = el.querySelector<HTMLElement>('.arts-lightbox-flight__veil')
    expect(veil?.style.backgroundColor).toBe('rgb(35, 35, 35)')
    const wrap = el.querySelector<HTMLElement>('.arts-lightbox-flight__extra')
    expect(wrap?.style.width).toBe('150px')
    const clone = wrap?.firstElementChild as HTMLElement
    // A clone, not the element: the page keeps its caption. Ids never
    // duplicate, the look travels inline, its own motion is neutralised.
    expect(clone).not.toBe(caption)
    expect(clone.textContent).toBe('Garden Curve')
    expect(clone.hasAttribute('id')).toBe(false)
    expect(clone.hasAttribute('data-arts-lightbox-fly')).toBe(false)
    expect(clone.style.color).toBe('rgb(255, 255, 255)')
    expect(clone.style.translate).toBe('none')

    layer.fly(() => frame, 800, 'power2.inOut')
    // outer, inner, radius, veil opacity, caption placement, caption opacity
    expect(animate).toHaveBeenCalledTimes(6)
  })

  it('replaces a stale element on re-mount', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' })
    layer.mount(box, { src: '/b.jpg' })
    const els = document.querySelectorAll('.arts-lightbox-flight')
    expect(els.length).toBe(1)
    expect(els[0]?.querySelector('img')?.getAttribute('src')).toBe('/b.jpg')
  })

  it('mounts inside the root, so the chrome paints over the travelling image', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' })

    expect(root.querySelector('.arts-lightbox-flight')).not.toBeNull()
  })

  it('detaches to body so it can outlive the root being torn down', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' })
    const el = root.querySelector('.arts-lightbox-flight')

    layer.detach()
    root.remove() // what pswp.destroy() does

    // Still alive, still its own box, still carrying its final frame.
    expect(el?.parentElement).toBe(document.body)
    expect((el as HTMLElement).style.width).toBe('600px')
  })

  it('leaves an already-detached layer alone', () => {
    const layer = createFlightLayer(() => fakeRoot())
    layer.mount(box, { src: '/a.jpg' })
    layer.detach()
    layer.detach()

    expect(document.querySelectorAll('.arts-lightbox-flight')).toHaveLength(1)
  })

  it('fades before unmounting, and goes when the fade ends', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' })
    const el = root.querySelector('.arts-lightbox-flight') as HTMLElement

    layer.leave()
    expect(el.classList.contains('arts-lightbox-flight_leaving')).toBe(true)
    // Still present — the slide underneath needs something to dissolve from.
    expect(root.querySelector('.arts-lightbox-flight')).not.toBeNull()

    el.dispatchEvent(new Event('transitionend'))
    expect(root.querySelector('.arts-lightbox-flight')).toBeNull()
  })

  it('arrive() mounts under a fade-in — the close cover must not hard-swap', () => {
    const layer = createFlightLayer(() => document.body)
    layer.mount(box, { src: '/poster.jpg' })
    layer.arrive()
    const el = document.querySelector('.arts-lightbox-flight') as HTMLElement
    // The leaving class was applied and removed within the same call after a
    // forced reflow: the element ends visible, transitioning from opacity 0.
    expect(el.classList.contains('arts-lightbox-flight_leaving')).toBe(false)
    layer.unmount()
  })

  it('fly, retarget, arrive, leave and detach are no-ops before mount', () => {
    const layer = createFlightLayer(() => fakeRoot())
    expect(() => layer.fly(() => frame, 800, 'power2.inOut')).not.toThrow()
    expect(() => layer.retarget(() => frame)).not.toThrow()
    expect(() => layer.arrive()).not.toThrow()
    expect(() => layer.leave()).not.toThrow()
    expect(() => layer.detach()).not.toThrow()
  })

  it('leave is a no-op once the layer has already been unmounted', () => {
    const root = fakeRoot()
    const layer = createFlightLayer(() => root)
    layer.mount(box, { src: '/a.jpg' })
    layer.unmount()

    expect(() => layer.leave()).not.toThrow()
    expect(document.querySelector('.arts-lightbox-flight')).toBeNull()
  })

  describe('unmountLater vs a fresh mount', () => {
    let frames: ReturnType<typeof installFrameClock>

    beforeEach(() => {
      frames = installFrameClock()
    })

    it('bails out when a later mount replaces the layer mid-chain', () => {
      const root = fakeRoot()
      const layer = createFlightLayer(() => root)
      layer.mount(box, { src: '/a.jpg' })

      layer.unmountLater(2)
      layer.mount(box, { src: '/b.jpg' })

      frames.step()
      frames.step()

      const els = document.querySelectorAll('.arts-lightbox-flight')
      expect(els).toHaveLength(1)
      expect(els[0]?.querySelector('img')?.getAttribute('src')).toBe('/b.jpg')

      // The new layer is still live — a buggy chain would have nulled it out.
      expect(() => layer.fly(() => frame, 800, 'power2.inOut')).not.toThrow()
    })

    it('unmounts once the frame count elapses without a race', () => {
      const root = fakeRoot()
      const layer = createFlightLayer(() => root)
      layer.mount(box, { src: '/a.jpg' })

      layer.unmountLater(2)

      frames.step()
      frames.step()

      expect(document.querySelector('.arts-lightbox-flight')).toBeNull()
    })
  })
})
