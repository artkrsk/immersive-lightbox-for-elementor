// @vitest-environment happy-dom

import type { IGallery, ILightboxApi, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerThumbnailsStrip } from '@ts/ui/thumbnailsStrip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const ACTIVE = 'arts-lightbox-thumbs__item_active'

function fakeApi(): ILightboxApi {
  return { close: vi.fn(), next: vi.fn(), prev: vi.fn(), goTo: vi.fn() }
}

function fakeGallery(msrcs: (string | undefined)[], types: ISlideData['type'][] = []): IGallery {
  const slides: ISlideData[] = msrcs.map((msrc, i) => {
    const slide: ISlideData = { key: `k${i}`, type: types[i] ?? 'image', src: '' }
    if (msrc !== undefined) {
      slide.msrc = msrc
    }
    return slide
  })
  return { id: 'g', slides, elementsByKey: new Map() }
}

/** One vimeo slide beside an image, so the strip is a strip. */
function vimeoGallery(id: string, hash?: string): IGallery {
  const gallery = fakeGallery(['a.jpg', undefined], ['image', 'video'])
  const slide = gallery.slides[1] as ISlideData
  slide.videoEmbed = 'vimeo'
  slide.videoId = id
  if (hash) {
    slide.videoHash = hash
  }
  return gallery
}

function buttons(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.arts-lightbox-thumbs__item')]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('registerThumbnailsStrip', () => {
  it('renders a lazy thumbnail per slide, a play glyph for a posterless video, else the index', () => {
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      fakeGallery(['a.jpg', undefined, undefined], ['image', 'video', 'html']),
      fakeApi(),
      'bottom'
    )
    const [withImage, video, html] = buttons(pswp.uiElementAt(0)) as [
      HTMLElement,
      HTMLElement,
      HTMLElement
    ]

    const img = withImage.querySelector('img')
    expect(img?.getAttribute('src')).toBe('a.jpg')
    expect(img?.getAttribute('loading')).toBe('lazy')
    // A self-hosted video with no poster says what it is rather than where
    // it sits; an html slide has no natural glyph and keeps its number.
    expect(video.querySelector('svg')).not.toBeNull()
    expect(video.textContent?.trim()).toBe('')
    expect(html.textContent).toBe('3')
  })

  it('replaces a vimeo glyph with the frame oEmbed hands back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ thumbnail_url: 'https://i.vimeocdn.com/video/9-d_295x166' })
        } as unknown as Response)
      )
    )
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      vimeoGallery('2001'),
      fakeApi(),
      'bottom'
    )
    const video = buttons(pswp.uiElementAt(0))[1] as HTMLElement

    // The glyph is what the tile shows while the round trip is out.
    expect(video.querySelector('svg')).not.toBeNull()
    await vi.waitFor(() => expect(video.querySelector('img')).not.toBeNull())

    expect(video.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.vimeocdn.com/video/9-d_295x166'
    )
    expect(video.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    expect(video.querySelector('svg')).toBeNull()
  })

  it('lets the youtube frame outrank the image the link was hung on', () => {
    const gallery = fakeGallery(['a.jpg', 'author-photo.jpg'], ['image', 'video'])
    const slide = gallery.slides[1] as ISlideData
    slide.videoEmbed = 'youtube'
    slide.videoId = 'dQw4w9WgXcQ'
    const pswp = fakePswp()
    registerThumbnailsStrip(pswp as unknown as PhotoSwipe, gallery, fakeApi(), 'bottom')
    const [image, video] = buttons(pswp.uiElementAt(0)) as [HTMLElement, HTMLElement]

    expect(video.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    )
    // Only video slides are second-guessed; a photograph is its own thumbnail.
    expect(image.querySelector('img')?.getAttribute('src')).toBe('a.jpg')
  })

  it('lets the vimeo frame outrank the image the link was hung on', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ thumbnail_url: 'https://i.vimeocdn.com/video/7-d_295x166' })
        } as unknown as Response)
      )
    )
    const gallery = vimeoGallery('2003')
    // The author hung the link on a photo of their own, so the tile starts as
    // that photo — indistinguishable from an image slide beside it.
    ;(gallery.slides[1] as ISlideData).msrc = 'author-photo.jpg'
    const pswp = fakePswp()
    registerThumbnailsStrip(pswp as unknown as PhotoSwipe, gallery, fakeApi(), 'bottom')
    const video = buttons(pswp.uiElementAt(0))[1] as HTMLElement

    expect(video.querySelector('img')?.getAttribute('src')).toBe('author-photo.jpg')
    await vi.waitFor(() =>
      expect(video.querySelector('img')?.getAttribute('src')).toBe(
        'https://i.vimeocdn.com/video/7-d_295x166'
      )
    )
  })

  it('keeps the glyph when the video has no thumbnail to give', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) } as unknown as Response))
    )
    const pswp = fakePswp()
    registerThumbnailsStrip(
      pswp as unknown as PhotoSwipe,
      vimeoGallery('2002'),
      fakeApi(),
      'bottom'
    )
    const video = buttons(pswp.uiElementAt(0))[1] as HTMLElement
    await Promise.resolve()
    await Promise.resolve()

    expect(video.querySelector('img')).toBeNull()
    expect(video.querySelector('svg')).not.toBeNull()
  })

  it('asks nothing of the network for a youtube or self-hosted video', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const gallery = fakeGallery(['a.jpg', undefined], ['image', 'video'])
    ;(gallery.slides[1] as ISlideData).videoEmbed = 'youtube'
    const pswp = fakePswp()
    registerThumbnailsStrip(pswp as unknown as PhotoSwipe, gallery, fakeApi(), 'bottom')

    expect(fetch).not.toHaveBeenCalled()
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
