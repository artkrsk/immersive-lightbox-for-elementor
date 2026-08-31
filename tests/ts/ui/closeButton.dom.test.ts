// @vitest-environment happy-dom

import type { ILightboxApi } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerCloseButton } from '@ts/ui/closeButton'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function fakeApi(): ILightboxApi {
  return { close: vi.fn(), next: vi.fn(), prev: vi.fn(), goTo: vi.fn() }
}

describe('registerCloseButton', () => {
  it('builds two rotated bars, each carrying its own blink layers', () => {
    const pswp = fakePswp()
    registerCloseButton(pswp as unknown as PhotoSwipe, fakeApi(), '')
    const element = pswp.uiElementAt(0)

    const bars = element.querySelectorAll('.arts-lightbox-close__bar')
    expect(bars).toHaveLength(2)
    expect(element.querySelector('.arts-lightbox-close__bar_1.arts-lightbox-blink')).not.toBeNull()
    expect(element.querySelector('.arts-lightbox-close__bar_2.arts-lightbox-blink')).not.toBeNull()
    for (const bar of bars) {
      expect(bar.querySelectorAll('.arts-lightbox-blink__layer')).toHaveLength(2)
    }
  })

  it('lets a supplied icon replace the bars wholesale', () => {
    const pswp = fakePswp()
    registerCloseButton(
      pswp as unknown as PhotoSwipe,
      fakeApi(),
      '<span data-testid="custom-x"></span>'
    )
    const element = pswp.uiElementAt(0)

    expect(element.querySelector('[data-testid="custom-x"]')).not.toBeNull()
    expect(element.querySelector('.arts-lightbox-close__bar')).toBeNull()
  })

  it('routes clicks through the api so the close choreography runs', () => {
    const pswp = fakePswp()
    const api = fakeApi()
    registerCloseButton(pswp as unknown as PhotoSwipe, api, '')
    const element = pswp.uiElementAt(0)

    element.dispatchEvent(new MouseEvent('click'))

    expect(api.close).toHaveBeenCalledTimes(1)
  })

  it('carries no cursor-follower attributes — hints are that plugin’s to add', () => {
    const pswp = fakePswp()
    registerCloseButton(pswp as unknown as PhotoSwipe, fakeApi(), '')
    const element = pswp.uiElementAt(0)

    expect(element.getAttribute('data-arts-cursor-follower-target')).toBeNull()
  })
})
