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

  it('keeps the cursor-follower hook', () => {
    const pswp = fakePswp()
    registerArrows(pswp as unknown as PhotoSwipe, fakeApi(), ICONS)
    const prevEl = pswp.uiElementAt(0)

    expect(prevEl.getAttribute('data-arts-cursor-follower-target')).toContain('magnetic')
  })
})
