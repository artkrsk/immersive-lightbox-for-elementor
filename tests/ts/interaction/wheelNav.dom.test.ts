// @vitest-environment happy-dom

import { attachWheelNav } from '@ts/interaction/wheelNav'
import type { IOptions } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SLIDE_WIDTH = 1000

/**
 * A main scroll that mirrors the fork's own `moveTo` contract: it stores x,
 * and — this is the part the state machine reads back — applies END FRICTION
 * when the gallery cannot loop, so `mainScroll.x !== the requested x` at the
 * boundaries (main-scroll.ts, moveTo).
 */
function fakeNav({ canLoop = true }: { canLoop?: boolean } = {}) {
  const moveIndexBy = vi.fn()
  const stopMainScroll = vi.fn()
  const positionIndex = 0
  const mainScroll = {
    x: 0,
    slideWidth: SLIDE_WIDTH,
    getCurrSlideX: () => SLIDE_WIDTH * positionIndex,
    isShifted: () => mainScroll.x !== mainScroll.getCurrSlideX(),
    moveTo: vi.fn((x: number, dragging?: boolean) => {
      if (!canLoop && dragging) {
        const offset = (mainScroll.getCurrSlideX() - x) / SLIDE_WIDTH
        const delta = Math.round(x - mainScroll.x)
        if (offset < 0 && delta > 0) {
          x = mainScroll.x + delta * 0.35
        }
      }
      mainScroll.x = x
    }),
    moveIndexBy
  }

  const handlers = new Map<string, ((e: never) => void)[]>()
  const pswp = {
    on(name: string, fn: (e: never) => void) {
      const list = handlers.get(name) ?? []
      list.push(fn)
      handlers.set(name, list)
    },
    element: document.createElement('div'),
    viewportSize: { x: SLIDE_WIDTH },
    animations: { stopMainScroll },
    mainScroll
  }

  const opts = {
    explore: { enabled: true },
    zoom: { mode: 'fill', wheelToZoom: false }
  } as unknown as IOptions

  const emit = (name: string, e: unknown): void => {
    for (const fn of handlers.get(name) ?? []) {
      fn(e as never)
    }
  }

  /** One wheel event, `dt` ms after the previous one. */
  const wheel = (
    deltaX: number,
    {
      dt = 16,
      deltaY = 0,
      momentum,
      ctrlKey = false
    }: {
      dt?: number
      deltaY?: number
      momentum?: boolean
      ctrlKey?: boolean
    } = {}
  ): void => {
    vi.advanceTimersByTime(dt)
    emit('wheel', {
      preventDefault: () => {},
      originalEvent: { deltaX, deltaY, ctrlKey, momentum }
    })
  }

  return {
    pswp: pswp as unknown as PhotoSwipe,
    opts,
    mainScroll,
    moveIndexBy,
    stopMainScroll,
    emit,
    wheel
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  window.matchMedia = ((query: string) => ({
    matches: query === '(pointer: fine)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  vi.useRealTimers()
})

describe('wheelNav — gating', () => {
  it('ctrl+wheel is left alone (trackpad pinch stays stock zoom)', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-80, { ctrlKey: true })
    expect(nav.mainScroll.moveTo).not.toHaveBeenCalled()
  })

  it('vertical wheel owns nothing', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-5, { deltaY: -80 })
    expect(nav.mainScroll.moveTo).not.toHaveBeenCalled()
  })

  it('a stray momentum tail in idle never starts a gesture', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-80, { momentum: true })
    expect(nav.mainScroll.moveTo).not.toHaveBeenCalled()
    expect(nav.stopMainScroll).not.toHaveBeenCalled()
  })

  it('stays off without explore, because the wheel then pans a zoomed slide', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, { ...nav.opts, explore: { enabled: false } } as IOptions)
    nav.wheel(-80, { momentum: false })
    expect(nav.stopMainScroll).not.toHaveBeenCalled()
  })

  it('navigates under zoom mode off even without explore — nothing is pannable', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, {
      explore: { enabled: false },
      zoom: { mode: 'off', wheelToZoom: false }
    } as unknown as IOptions)
    nav.wheel(-80, { momentum: false })
    expect(nav.stopMainScroll).toHaveBeenCalled()
    expect(nav.mainScroll.x).toBe(80)
  })
})

describe('wheelNav — tracking', () => {
  it('follows the fingers 1:1 and stops any running scroll animation', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-80, { momentum: false })
    expect(nav.stopMainScroll).toHaveBeenCalled()
    expect(nav.mainScroll.x).toBe(80)
  })

  it('clamps displacement to one slide around the current index', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    for (let i = 0; i < 30; i++) {
      nav.wheel(-200, { momentum: false })
    }
    expect(nav.mainScroll.x).toBeLessThanOrEqual(SLIDE_WIDTH)
  })

  it('commits the index mid-gesture once the strip fully reaches a neighbor', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    // Deltas stay non-decaying so the fallback classifier never calls momentum.
    nav.wheel(-400, { momentum: false })
    nav.wheel(-500, { momentum: false })
    nav.wheel(-600, { momentum: false })
    expect(nav.moveIndexBy).toHaveBeenCalledWith(-1, true, expect.any(Number))
  })

  it('holding still does not settle — only the safety timeout does', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-80, { momentum: false })
    nav.moveIndexBy.mockClear()
    vi.advanceTimersByTime(1000)
    expect(nav.moveIndexBy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(nav.moveIndexBy).toHaveBeenCalled()
  })
})

describe('wheelNav — release', () => {
  it('native momentum settles the strip', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-300, { momentum: false })
    nav.moveIndexBy.mockClear()
    nav.wheel(-200, { momentum: true })
    expect(nav.moveIndexBy).toHaveBeenCalledTimes(1)
  })

  it('the decay signature settles after a run of shrinking deltas', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-300)
    nav.moveIndexBy.mockClear()
    nav.wheel(-250)
    nav.wheel(-200)
    nav.wheel(-150)
    expect(nav.moveIndexBy).toHaveBeenCalledTimes(1)
  })

  it('non-wheel input proves a quiet lift and settles from tracking', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.emit('bindEvents', undefined)
    nav.wheel(-300, { momentum: false })
    nav.moveIndexBy.mockClear()
    document.dispatchEvent(new Event('keydown'))
    expect(nav.moveIndexBy).toHaveBeenCalledTimes(1)
  })

  it('non-wheel input in idle settles nothing', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.emit('bindEvents', undefined)
    document.dispatchEvent(new Event('keydown'))
    expect(nav.moveIndexBy).not.toHaveBeenCalled()
  })
})

describe('wheelNav — coasting', () => {
  it('swallows the momentum tail after the settle is committed', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-300, { momentum: false })
    nav.wheel(-200, { momentum: true })
    nav.mainScroll.moveTo.mockClear()
    nav.wheel(-150, { momentum: true })
    nav.wheel(-100, { momentum: true })
    expect(nav.mainScroll.moveTo).not.toHaveBeenCalled()
  })

  it('a fresh finger gesture breaks through and chains', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-300, { momentum: false })
    nav.wheel(-200, { momentum: true })
    nav.mainScroll.moveTo.mockClear()
    nav.stopMainScroll.mockClear()
    nav.wheel(-300, { momentum: false })
    expect(nav.stopMainScroll).toHaveBeenCalled()
    expect(nav.mainScroll.moveTo).toHaveBeenCalled()
  })

  it('falls back to idle once the tail goes quiet', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.wheel(-300, { momentum: false })
    nav.wheel(-200, { momentum: true })
    vi.advanceTimersByTime(300)
    nav.mainScroll.moveTo.mockClear()
    nav.wheel(-80, { momentum: true })
    expect(nav.mainScroll.moveTo).not.toHaveBeenCalled()
  })
})

describe('wheelNav — end friction', () => {
  /**
   * The index commit reads mainScroll.x back AFTER moveTo, so the fork's
   * boundary friction (main-scroll.ts, moveTo) resists the commit. Computing
   * the shift from the REQUESTED x instead would let the strip commit at a
   * boundary it must never leave — the regression this pair exists to catch.
   * Growing magnitudes keep the fallback classifier out of decay, so the
   * gesture stays in tracking throughout.
   */
  const RAMP = [-200, -250, -300, -350, -400, -450]

  it('the same gesture commits when the gallery can loop', () => {
    const nav = fakeNav({ canLoop: true })
    attachWheelNav(nav.pswp, nav.opts)
    for (const dx of RAMP) {
      nav.wheel(dx, { momentum: false })
    }
    expect(nav.moveIndexBy).toHaveBeenCalledWith(-1, true, expect.any(Number))
  })

  it('friction holds the strip short of a commit at the first slide', () => {
    const nav = fakeNav({ canLoop: false })
    attachWheelNav(nav.pswp, nav.opts)
    for (const dx of RAMP) {
      nav.wheel(dx, { momentum: false })
    }
    expect(nav.mainScroll.x).toBeLessThan(SLIDE_WIDTH - 1)
    expect(nav.moveIndexBy).not.toHaveBeenCalled()
  })
})

describe('wheelNav — destroy', () => {
  it('stops reacting to other-input events once destroyed', () => {
    const nav = fakeNav()
    attachWheelNav(nav.pswp, nav.opts)
    nav.emit('bindEvents', undefined)
    nav.wheel(-300, { momentum: false })
    nav.emit('destroy', undefined)
    nav.moveIndexBy.mockClear()
    document.dispatchEvent(new Event('keydown'))
    expect(nav.moveIndexBy).not.toHaveBeenCalled()
  })
})
