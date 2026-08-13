// @vitest-environment happy-dom

import type { IGallery, ILightboxApi, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerThumbnailsStrip } from '@ts/ui/thumbnailsStrip'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const ACTIVE = 'arts-lightbox-thumbs__item_active'

function fakeApi(): ILightboxApi {
  return { close: vi.fn(), next: vi.fn(), prev: vi.fn(), goTo: vi.fn() }
}

function fakeGallery(msrcs: (string | undefined)[]): IGallery {
  const slides: ISlideData[] = msrcs.map((msrc, i) => {
    const slide: ISlideData = { key: `k${i}`, type: 'image', src: '' }
    if (msrc !== undefined) {
      slide.msrc = msrc
    }
    return slide
  })
  return { id: 'g', slides, elementsByKey: new Map() }
}

function buttons(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.arts-lightbox-thumbs__item')]
}

describe('registerThumbnailsStrip', () => {
  it('renders a lazy thumbnail per slide, falling back to the index', () => {
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      fakeGallery(['a.jpg', undefined]),
      fakeApi(),
      'bottom'
    )
    const [withImage, withoutImage] = buttons(pswp.uiElementAt(0)) as [HTMLElement, HTMLElement]

    const img = withImage.querySelector('img')
    expect(img?.getAttribute('src')).toBe('a.jpg')
    expect(img?.getAttribute('loading')).toBe('lazy')
    // Video embeds and html slides frequently have no poster to borrow.
    expect(withoutImage.textContent).toBe('2')
  })

  it('carries the position as a modifier so CSS can place the rail', () => {
    const pswp = fakePswp()
    registerThumbnailsStrip(pswp as unknown as PhotoSwipe, fakeGallery(['a']), fakeApi(), 'left')

    expect(pswp.uiElementAt(0).className).toContain('arts-lightbox-thumbs_left')
  })

  it('routes a click through the api rather than straight to pswp', () => {
    const pswp = fakePswp()
    const api = fakeApi()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      fakeGallery(['a', 'b', 'c']),
      api,
      'bottom'
    )
    buttons(pswp.uiElementAt(0))[2]?.dispatchEvent(new MouseEvent('click'))

    expect(api.goTo).toHaveBeenCalledWith(2)
  })

  it('marks the nearest slide active, not the one being left', () => {
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      fakeGallery(['a', 'b', 'c']),
      fakeApi(),
      'bottom'
    )
    const items = buttons(pswp.uiElementAt(0))

    expect(items[0]?.classList.contains(ACTIVE)).toBe(true)

    // 40% of the way — slide 0 is still the nearest, so the highlight holds
    // even though the scroll has already started gliding.
    pswp.potentialIndex = 1
    pswp.mainScroll.currSlideX = -1000
    pswp.mainScroll.x = -400
    pswp.emit('moveMainScroll', { x: -400, dragging: true })

    expect(items[0]?.classList.contains(ACTIVE)).toBe(true)

    // 60% — past the midpoint, so it commits mid-flight rather than waiting
    // for the slide to land.
    pswp.mainScroll.x = -600
    pswp.emit('moveMainScroll', { x: -600, dragging: true })

    expect(items[0]?.classList.contains(ACTIVE)).toBe(false)
    expect(items[1]?.classList.contains(ACTIVE)).toBe(true)
  })

  it('scrolls a vertical rail on the block axis', () => {
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      fakeGallery(['a', 'b', 'c']),
      fakeApi(),
      'right'
    )
    const el = pswp.uiElementAt(0)
    // happy-dom reports zero layout, so assert the axis rather than the value.
    Object.defineProperty(el, 'scrollHeight', { value: 300, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true })

    pswp.potentialIndex = 2
    pswp.emit('change', {})

    expect(el.scrollTop).toBeGreaterThan(0)
    expect(el.scrollLeft).toBe(0)
  })
})
