// @vitest-environment happy-dom

import { DEFAULT_OPTIONS } from '@ts/constants'
import { registerContent } from '@ts/content/registerContent'
import type { IOptions, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe.js'
import { audioFocus } from '@ts/video/audioFocus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function opts(video: Partial<IOptions['video']> = {}): IOptions {
  return { ...DEFAULT_OPTIONS, video: { ...DEFAULT_OPTIONS.video, ...video } }
}

function embedData(index: number): {
  data: ISlideData
  content: { data: ISlideData; index: number; element?: HTMLElement }
} {
  const data: ISlideData = {
    key: `k${index}`,
    type: 'video',
    src: 'https://youtu.be/dQw4w9WgXcQ',
    videoSrc: 'https://youtu.be/dQw4w9WgXcQ',
    videoEmbed: 'youtube'
  }
  return { data, content: { data, index } }
}

function fileData(
  index: number,
  extra: Partial<ISlideData> = {}
): { content: { data: ISlideData; index: number; element?: HTMLElement } } {
  const data: ISlideData = {
    key: `f${index}`,
    type: 'video',
    src: 'https://example.com/clip.mp4',
    videoSrc: 'https://example.com/clip.mp4',
    videoEmbed: null,
    ...extra
  }
  return { content: { data, index } }
}

function loadEvent(content: { data: ISlideData; index: number; element?: HTMLElement }) {
  return { content, preventDefault: vi.fn() }
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  audioFocus.releaseAll()
  vi.restoreAllMocks()
})

describe('registerContent — watch intent', () => {
  it('arms autoplay ONLY on the first build of the opened index', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 1)

    // neighbor builds first — must not consume the intent
    const neighbor = loadEvent(embedData(0).content)
    pswp.emit('contentLoad', neighbor)
    expect(neighbor.content.element?.getAttribute('src')).not.toContain('autoplay')

    const opened = loadEvent(embedData(1).content)
    pswp.emit('contentLoad', opened)
    expect(opened.content.element?.getAttribute('src')).toContain('autoplay=1')

    // REBUILD of the opened index (evicted content) comes back disarmed
    const rebuilt = loadEvent(embedData(1).content)
    pswp.emit('contentLoad', rebuilt)
    expect(rebuilt.content.element?.getAttribute('src')).not.toContain('autoplay')
  })

  it('never arms anything when video.autoplay is off', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts({ autoplay: false }), 1)
    const opened = loadEvent(embedData(1).content)
    pswp.emit('contentLoad', opened)
    expect(opened.content.element?.getAttribute('src')).not.toContain('autoplay')
  })
})

describe('registerContent — embed re-append disarm', () => {
  it('swaps to the disarmed URL on the SECOND append only', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 0)
    const opened = loadEvent(embedData(0).content)
    pswp.emit('contentLoad', opened)
    const iframe = opened.content.element as HTMLIFrameElement
    expect(iframe.getAttribute('src')).toContain('autoplay=1')

    pswp.emit('contentAppend', { content: opened.content })
    expect(iframe.getAttribute('src')).toContain('autoplay=1') // first append keeps watch intent

    pswp.emit('contentAppend', { content: opened.content })
    expect(iframe.getAttribute('src')).not.toContain('autoplay') // re-append reloads — disarmed
  })
})

describe('registerContent — content tiers', () => {
  it('adopted slides get a landing pad, clone sources get a seeking clone', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 0)

    const adopted = loadEvent(
      fileData(0, {
        adopted: {
          element: document.createElement('video'),
          home: null,
          take: () => document.createElement('video'),
          return: () => {}
        }
      }).content
    )
    pswp.emit('contentLoad', adopted)
    expect(adopted.content.element?.className).toContain('arts-lightbox-media_adopted')

    const source = document.createElement('video')
    source.src = '/bg.mp4'
    const cloned = loadEvent(fileData(1, { cloneSource: source }).content)
    pswp.emit('contentLoad', cloned)
    const clone = cloned.content.element as HTMLVideoElement
    expect(clone.tagName).toBe('VIDEO')
    expect(clone).not.toBe(source)
    expect(clone.controls).toBe(true)
    expect(clone.className).toContain('arts-lightbox-media')
  })

  it('html slides render their template markup', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 0)
    const data: ISlideData = { key: 'h', type: 'html', src: '', html: '<p>hi</p>' }
    const e = loadEvent({ data, index: 0 })
    pswp.emit('contentLoad', e)
    expect(e.content.element?.className).toBe('arts-lightbox-html')
    expect(e.content.element?.innerHTML).toBe('<p>hi</p>')
  })
})

describe('registerContent — activation playback', () => {
  it('plays on activate, pauses on deactivate, honors data.autoplay === false', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 9)

    const active = loadEvent(fileData(0).content)
    pswp.emit('contentLoad', active)
    const video = active.content.element as HTMLVideoElement
    pswp.emit('contentActivate', { content: active.content })
    expect(video.play).toHaveBeenCalledTimes(1)
    pswp.emit('contentDeactivate', { content: active.content })
    expect(video.pause).toHaveBeenCalledTimes(1)

    const optedOut = loadEvent(fileData(1, { autoplay: false }).content)
    pswp.emit('contentLoad', optedOut)
    pswp.emit('contentActivate', { content: optedOut.content })
    expect((optedOut.content.element as HTMLVideoElement).play).toHaveBeenCalledTimes(1) // shared spy: still the 1 call from above
  })
})

describe('registerContent — fit-only zoom for video/html', () => {
  it('forces initial/secondary/max to fit', () => {
    const pswp = fakePswp()
    registerContent(pswp as unknown as PhotoSwipe, opts(), 0)
    const zoomLevels = { fit: 0.5, fill: 0.9, initial: 0.9, secondary: 0.9, max: 1 }
    pswp.emit('zoomLevelsUpdate', {
      zoomLevels,
      slideData: { key: 'k', type: 'video', src: '' } satisfies ISlideData
    })
    expect(zoomLevels.initial).toBe(0.5)
    expect(zoomLevels.secondary).toBe(0.5)
    expect(zoomLevels.max).toBe(0.5)
  })
})

describe('registerContent — sound surface', () => {
  it('reflects and toggles the active video element, claiming focus on unmute', () => {
    const pswp = fakePswp()
    const media = registerContent(pswp as unknown as PhotoSwipe, opts(), 0)
    const active = loadEvent(fileData(0).content)
    pswp.emit('contentLoad', active)
    const video = active.content.element as HTMLVideoElement
    video.muted = true
    pswp.currSlide = { data: active.content.data, content: { element: video } }

    const sound = media.getSound()
    expect(sound?.muted).toBe(true)
    sound?.setMuted(false)
    expect(video.muted).toBe(false)

    // another claimant re-mutes it through the focus release
    audioFocus.claim('other', () => {})
    expect(video.muted).toBe(true)
  })

  it('returns null on non-video slides', () => {
    const pswp = fakePswp()
    const media = registerContent(pswp as unknown as PhotoSwipe, opts(), 0)
    pswp.currSlide = { data: { key: 'i', type: 'image', src: '/a.jpg' }, content: {} }
    expect(media.getSound()).toBeNull()
  })
})
