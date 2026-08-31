// @vitest-environment happy-dom

import Keyboard from '@ts/photoswipe/keyboard'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/**
 * The slice of a pswp the arrow-key branch touches: the nav options, the item
 * count, and the two methods it dispatches to. `events.add` is honoured so the
 * real listener runs against real events.
 */
function stubPswp(): { pswp: PhotoSwipe; bind: () => void; next: () => void; prev: () => void } {
  const handlers: Record<string, Handler[]> = {}
  const next = vi.fn()
  const prev = vi.fn()
  const root = document.createElement('div')
  document.body.appendChild(root)
  const pswp = {
    options: { trapFocus: false, returnFocus: false, arrowKeys: true },
    element: root,
    currSlide: undefined,
    events: {
      add: (target: EventTarget, type: string, listener: EventListener) => {
        target.addEventListener(type, listener)
      }
    },
    dispatch: () => ({ defaultPrevented: false }),
    getNumItems: () => 3,
    next,
    prev,
    on: (name: string, fn: Handler) => {
      handlers[name] ??= []
      handlers[name].push(fn)
    }
  } as unknown as PhotoSwipe

  return {
    pswp,
    bind: () => {
      for (const fn of handlers.bindEvents ?? []) {
        fn()
      }
    },
    next: next as unknown as () => void,
    prev: prev as unknown as () => void
  }
}

function press(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('Keyboard navigation direction', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
    document.body.innerHTML = ''
  })

  it('advances with ArrowRight in a left-to-right document', () => {
    const stub = stubPswp()
    new Keyboard(stub.pswp)
    stub.bind()

    press('ArrowRight')
    expect(stub.next).toHaveBeenCalledTimes(1)
    expect(stub.prev).not.toHaveBeenCalled()

    press('ArrowLeft')
    expect(stub.prev).toHaveBeenCalledTimes(1)
  })

  it('advances with ArrowLeft in a right-to-left document', () => {
    // Navigation follows reading order, so the horizontal keys swap with the
    // arrow buttons, which swap sides and glyphs under `dir="rtl"` too.
    document.documentElement.setAttribute('dir', 'rtl')
    const stub = stubPswp()
    new Keyboard(stub.pswp)
    stub.bind()

    press('ArrowLeft')
    expect(stub.next).toHaveBeenCalledTimes(1)
    expect(stub.prev).not.toHaveBeenCalled()

    press('ArrowRight')
    expect(stub.prev).toHaveBeenCalledTimes(1)
  })
})
