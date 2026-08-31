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
    mountChrome(c)
    const el = c.pswp.element as HTMLElement
    expect(el.style.getPropertyValue('--arts-lightbox-chrome')).toBe('0')
    expect(el.classList.contains(TRANSITIONING_CLASS)).toBe(true)
  })

  it('creates the backdrop', () => {
    const c = ctx()
    mountChrome(c)
    expect(c.backdrop.current).not.toBeNull()
  })

  it('does nothing without a pswp element', () => {
    const c = ctx(false)
    expect(() => {
      mountChrome(c)
    }).not.toThrow()
    expect(c.backdrop.current).toBeNull()
  })
})
