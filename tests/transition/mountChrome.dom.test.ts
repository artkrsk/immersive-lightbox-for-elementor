// @vitest-environment happy-dom

import { TRANSITIONING_CLASS } from '@ts/constants'
import { mergeOptions } from '@ts/core/mergeOptions'
import type { ITransitionContext } from '@ts/interfaces'
import { mountChrome } from '@ts/transition/mountChrome'
import { describe, expect, it } from 'vitest'

function ctx(withElement = true) {
  const element = document.createElement('div')
  return {
    pswp: { element: withElement ? element : null },
    opts: mergeOptions(),
    backdrop: { current: null }
  } as unknown as ITransitionContext
}

describe('mountChrome', () => {
  it('starts the chrome hidden and marks the transition', () => {
    const c = ctx()
    mountChrome(c, false)
    const el = c.pswp.element as HTMLElement
    expect(el.style.getPropertyValue('--arts-lightbox-chrome')).toBe('0')
    expect(el.classList.contains(TRANSITIONING_CLASS)).toBe(true)
  })

  it('creates the backdrop either way', () => {
    const choreographed = ctx()
    mountChrome(choreographed, false)
    expect(choreographed.backdrop.current).not.toBeNull()

    const instant = ctx()
    mountChrome(instant, true)
    expect(instant.backdrop.current).not.toBeNull()
  })

  /** The pass-through gallery swap: the backdrop is already up from the
   *  outgoing gallery, so there is nothing to choreograph. */
  it('an instant open lands fully open and never marks transitioning', () => {
    const c = ctx()
    mountChrome(c, true)
    const el = c.pswp.element as HTMLElement
    expect(el.style.getPropertyValue('--arts-lightbox-chrome')).toBe('1')
    expect(el.classList.contains(TRANSITIONING_CLASS)).toBe(false)
  })

  it('does nothing without a pswp element', () => {
    const c = ctx(false)
    expect(() => {
      mountChrome(c, false)
    }).not.toThrow()
    expect(c.backdrop.current).toBeNull()
  })
})
