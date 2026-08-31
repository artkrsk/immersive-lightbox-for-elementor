// @vitest-environment happy-dom

import type { ILightboxApi } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerArrows } from '@ts/ui/arrows'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const ICONS = { prev: '<i data-testid="prev-icon"></i>', next: '<i data-testid="next-icon"></i>' }

function fakeApi(): ILightboxApi {
  return { close: vi.fn(), next: vi.fn(), prev: vi.fn(), goTo: vi.fn() }
}

describe('registerArrows', () => {
  it('duplicates the configured icon into both blink layers', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS)
    const prevEl = pswp.uiElementAt(0)
    const nextEl = pswp.uiElementAt(1)

    expect(
      prevEl.querySelectorAll('.arts-lightbox-blink__layer_normal [data-testid="prev-icon"]')
    ).toHaveLength(1)
    expect(
      prevEl.querySelectorAll('.arts-lightbox-blink__layer_hover [data-testid="prev-icon"]')
    ).toHaveLength(1)
    expect(nextEl.querySelectorAll('[data-testid="next-icon"]')).toHaveLength(2)
  })

  it('marks prev so its blink mirrors next', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS)
    const prevEl = pswp.uiElementAt(0)
    const nextEl = pswp.uiElementAt(1)

    expect(prevEl.className).toContain('arts-lightbox-arrow_prev')
    expect(nextEl.className).toContain('arts-lightbox-arrow_next')
  })

  it('swaps which glyph each button renders when the document reads RTL', () => {
    // Positions mirror via logical insets, so prev lands where reading starts
    // — the physical right — and must carry the glyph that points back there.
    // The pair is swapped rather than transform-mirrored, so a theme's own two
    // glyphs render exactly as authored.
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const pswp = fakePswp()
      registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS)
      const prevEl = pswp.uiElementAt(0)
      const nextEl = pswp.uiElementAt(1)

      expect(prevEl.className).toContain('arts-lightbox-arrow_prev')
      expect(prevEl.querySelectorAll('[data-testid="next-icon"]')).toHaveLength(2)
      expect(prevEl.querySelectorAll('[data-testid="prev-icon"]')).toHaveLength(0)
      expect(nextEl.querySelectorAll('[data-testid="prev-icon"]')).toHaveLength(2)
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })

  it('still routes each button to its own api call in RTL', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const pswp = fakePswp()
      const api = fakeApi()
      registerArrows(pswp as unknown as PhotoSwipe, api, ICONS)
      pswp.uiElementAt(0).dispatchEvent(new MouseEvent('click'))

      expect(api.prev).toHaveBeenCalledTimes(1)
      expect(api.next).not.toHaveBeenCalled()
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })

  it('routes clicks through the api rather than straight to pswp', () => {
    const pswp = fakePswp()
    const api = fakeApi()
    registerArrows(pswp as unknown as PhotoSwipe, api, ICONS)
    const prevEl = pswp.uiElementAt(0)
    const nextEl = pswp.uiElementAt(1)

    prevEl.dispatchEvent(new MouseEvent('click'))
    nextEl.dispatchEvent(new MouseEvent('click'))

    expect(api.prev).toHaveBeenCalledTimes(1)
    expect(api.next).toHaveBeenCalledTimes(1)
  })

  it('hides the dead arrow at each end when nothing loops or passes through', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS, { total: 3, endStops: true })
    const prevEl = pswp.uiElementAt(0)
    const nextEl = pswp.uiElementAt(1)
    const hidden = (el: HTMLElement) => el.classList.contains('arts-lightbox-arrow_hidden')

    pswp.mainScroll.slideWidth = 1000
    pswp.potentialIndex = 0
    pswp.emit('change', {})
    expect(hidden(prevEl)).toBe(true)
    expect(hidden(nextEl)).toBe(false)

    pswp.potentialIndex = 1
    pswp.emit('change', {})
    expect(hidden(prevEl)).toBe(false)
    expect(hidden(nextEl)).toBe(false)

    pswp.potentialIndex = 2
    pswp.emit('change', {})
    expect(hidden(prevEl)).toBe(false)
    expect(hidden(nextEl)).toBe(true)
  })

  it('keeps both arrows without end stops — loop or pass-through make them functional', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS, { total: 3, endStops: false })
    pswp.mainScroll.slideWidth = 1000
    pswp.potentialIndex = 0
    pswp.emit('change', {})
    expect(pswp.uiElementAt(0).classList.contains('arts-lightbox-arrow_hidden')).toBe(false)
  })

  it('carries no cursor-follower attributes — hints are that plugin’s to add', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS)
    const prevEl = pswp.uiElementAt(0)
    const nextEl = pswp.uiElementAt(1)

    expect(prevEl.getAttribute('data-arts-cursor-follower-target')).toBeNull()
    expect(nextEl.getAttribute('data-arts-cursor-follower-target')).toBeNull()
  })
})
