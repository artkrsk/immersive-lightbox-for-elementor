// @vitest-environment happy-dom

import { mergeOptions } from '@ts/core/mergeOptions'
import { attachExploreMode } from '@ts/interaction/exploreMode'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const CENTER = { x: -999, y: -999 }

/** Zoomed above fit, so aimSlideAtPointer / the glide actually move it. */
function fakeSlide() {
  const slide = {
    currZoomLevel: 2,
    zoomLevels: { fit: 1, fill: 2, initial: 2, secondary: 1 },
    bounds: {
      center: CENTER,
      min: { x: 0, y: 0 },
      max: { x: -400, y: -300 }
    },
    pan: { x: 0, y: 0 },
    isZoomable: () => true,
    setZoomLevel: vi.fn((level: number) => {
      slide.currZoomLevel = level
    }),
    applyCurrentZoomPan: vi.fn(),
    panTo: vi.fn()
  }
  return slide
}

function fakePswp(slide: ReturnType<typeof fakeSlide>) {
  const handlers = new Map<string, ((e: never) => void)[]>()
  return {
    currSlide: slide,
    element: document.createElement('div'),
    options: {} as Record<string, unknown>,
    mainScroll: { itemHolders: [{ slide }] },
    dispatch: vi.fn(),
    on(name: string, fn: (e: never) => void) {
      const list = handlers.get(name) ?? []
      list.push(fn)
      handlers.set(name, list)
    },
    emit(name: string, e?: unknown) {
      for (const fn of handlers.get(name) ?? []) {
        fn(e as never)
      }
    }
  }
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query === '(pointer: fine)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
  ;(window as { innerWidth: number }).innerWidth = 1000
  ;(window as { innerHeight: number }).innerHeight = 800
})

describe('attachExploreMode bindEvents wiring', () => {
  it('ignores mousemove before bindEvents fires — the aim stays at the default center', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachExploreMode(pswp as unknown as PhotoSwipe, mergeOptions())

    pswp.element.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 1000, clientY: 800, bubbles: true })
    )
    pswp.emit('change')

    expect(slide.pan).toEqual({ x: -200, y: -150 })
  })

  it('tracks mousemove once bindEvents has fired', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachExploreMode(pswp as unknown as PhotoSwipe, mergeOptions())

    pswp.emit('bindEvents')
    pswp.element.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 1000, clientY: 0, bubbles: true })
    )
    pswp.emit('change')

    expect(slide.pan).toEqual({ x: -400, y: 0 })
  })

  it('destroy cancels the zoom, releases the glide, and drops the window pointerup listener', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachExploreMode(pswp as unknown as PhotoSwipe, mergeOptions())
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    pswp.emit('bindEvents')
    expect(() => pswp.emit('destroy')).not.toThrow()

    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('pointerdown/pointerup after bindEvents do not throw', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachExploreMode(pswp as unknown as PhotoSwipe, mergeOptions())

    pswp.emit('bindEvents')
    expect(() => {
      pswp.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      window.dispatchEvent(new PointerEvent('pointerup'))
    }).not.toThrow()
  })
})
