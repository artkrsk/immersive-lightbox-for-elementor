// @vitest-environment happy-dom

import { attachInteractions } from '@ts/core/attachInteractions'
import { mergeOptions } from '@ts/core/mergeOptions'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const CENTER = { x: -999, y: -999 }

/** A slide sitting at fit, in a session whose mode is fill. */
function fakeSlide() {
  const slide = {
    currZoomLevel: 1,
    zoomLevels: { fit: 1, fill: 2, initial: 2, secondary: 1 },
    bounds: {
      center: CENTER,
      min: { x: 0, y: 0 },
      max: { x: -400, y: -300 }
    },
    pan: { x: 0, y: 0 },
    isZoomable: () => true,
    // Every real Slide carries its data; the zoom predicate reads the
    // guessed-dims flag off it.
    data: {},

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
    animations: { stopMainScroll: vi.fn() },
    dispatch: vi.fn(),
    // The drag cursor asks how many slides there are before promising a grab.
    getNumItems: () => 4,
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
})

describe('attachInteractions', () => {
  /**
   * The whole reason this module exists. zoomMode's change listener centers
   * an arriving slide; explore's aims it at the pointer. Both fire, in
   * registration order, and the LAST write wins — so explore must attach
   * after zoomMode or every slide arrives centered instead of aimed.
   */
  it('a slide arriving mid-session ends aimed at the pointer, not centered', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions())

    pswp.emit('change')

    // zoomMode did run — it lifted the slide from fit to the session's fill...
    expect(slide.setZoomLevel).toHaveBeenCalledWith(2)
    // ...and explore's aim landed after it, at the default centre pointer.
    expect(slide.pan).toEqual({ x: -200, y: -150 })
    expect(slide.pan).not.toEqual(CENTER)
  })

  it('the opening click seeds the aim, so the slide arrives under the cursor', () => {
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    // Past the viewport on both axes, so the seed clamps to the far corner
    // whatever size the test DOM reports.
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions(), { x: 99999, y: 99999 })

    pswp.emit('change')

    // Pointer at the bottom right reveals the image's bottom right.
    expect(slide.pan).toEqual({ x: -400, y: -300 })
  })

  it('replaces the click zoom with the aimed toggle when explore is on', () => {
    const pswp = fakePswp(fakeSlide())
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions())
    expect(typeof pswp.options.imageClickAction).toBe('function')
  })

  it('leaves the click action alone when explore is disabled', () => {
    const pswp = fakePswp(fakeSlide())
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions({ explore: { enabled: false } }))
    expect(pswp.options.imageClickAction).toBeUndefined()
  })

  it('zoom mode off attaches neither explore nor the session mode', () => {
    // Nothing zooms, so there is nothing to explore and no mode to keep.
    // Explore's opening-click seed would otherwise pan the slide; the zoom
    // mode would otherwise centre it on change.
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions({ zoom: { mode: 'off' } }), {
      x: 99999,
      y: 99999
    })
    pswp.emit('change')
    expect(slide.setZoomLevel).not.toHaveBeenCalled()
    expect(slide.pan).toEqual({ x: 0, y: 0 })
    expect(pswp.options.imageClickAction).toBeUndefined()
  })

  it('attaches nothing pointer-driven on a coarse-pointer device', () => {
    window.matchMedia = (() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    })) as unknown as typeof window.matchMedia
    const slide = fakeSlide()
    const pswp = fakePswp(slide)
    attachInteractions(pswp as unknown as PhotoSwipe, mergeOptions())

    pswp.emit('change')

    // zoomMode still syncs the mode; only the pointer aim is absent.
    expect(slide.pan).toEqual(CENTER)
    expect(pswp.options.imageClickAction).toBeUndefined()
  })
})
