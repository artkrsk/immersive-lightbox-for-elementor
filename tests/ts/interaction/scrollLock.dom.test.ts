// @vitest-environment happy-dom

import { lockPageScroll } from '@ts/interaction/scrollLock'
import { describe, expect, it } from 'vitest'

describe('lockPageScroll', () => {
  it('hides page overflow and restores exactly what was there', () => {
    const html = document.documentElement
    html.style.overflow = 'auto'

    const unlock = lockPageScroll()
    expect(html.style.overflow).toBe('hidden')

    unlock()
    expect(html.style.overflow).toBe('auto')
    html.style.overflow = ''
  })

  it('clips the body instead of making it a scroll container', () => {
    // `hidden` here would re-parent any descendant ViewTimeline source onto
    // the full-height body box — scroll-driven reveals snap to their end state.
    const body = document.body
    body.style.overflow = 'auto'

    const unlock = lockPageScroll()
    expect(body.style.overflow).toBe('clip')

    unlock()
    expect(body.style.overflow).toBe('auto')
    body.style.overflow = ''
  })

  it('compensates the vanished scrollbar so the page does not jump', () => {
    const html = document.documentElement
    Object.defineProperty(html, 'clientWidth', { value: 1885, configurable: true })
    ;(window as { innerWidth: number }).innerWidth = 1900

    const unlock = lockPageScroll()
    expect(html.style.paddingRight).toBe('15px')

    unlock()
    expect(html.style.paddingRight).toBe('')
  })
})
