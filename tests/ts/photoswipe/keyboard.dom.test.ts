// @vitest-environment happy-dom

import Keyboard from '@ts/photoswipe/keyboard'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/** The slice of a pswp the keyboard module touches. */
function stubPswp(): { pswp: PhotoSwipe; fire: (name: string) => void } {
  const handlers: Record<string, Handler[]> = {}
  const root = document.createElement('div')
  root.tabIndex = -1
  document.body.appendChild(root)
  const pswp = {
    options: { trapFocus: true, returnFocus: true },
    element: root,
    events: { add: vi.fn() },
    on: (name: string, fn: Handler) => {
      handlers[name] ??= []
      handlers[name].push(fn)
    }
  } as unknown as PhotoSwipe
  return {
    pswp,
    fire: (name) => {
      for (const fn of handlers[name] ?? []) {
        fn()
      }
    }
  }
}

describe('Keyboard focus return', () => {
  it('returns focus to the opener without scrolling it into view', () => {
    // The opener is the clicked anchor. A trigger taller than the fold is
    // usually clicked while partly off-screen, and a bare focus() on close
    // scrolls it fully into view — natively, instantly, behind any smooth
    // scroller's back. Same focus return, minus the jump.
    const link = document.createElement('a')
    link.href = '#'
    document.body.appendChild(link)
    link.focus()
    expect(document.activeElement).toBe(link)

    const { pswp, fire } = stubPswp()
    new Keyboard(pswp)
    fire('bindEvents')
    expect(document.activeElement).toBe(pswp.element)

    const focus = vi.spyOn(link, 'focus')
    fire('destroy')
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})
