// @vitest-environment happy-dom

import { registerActivationPlayback } from '@ts/content/activationPlayback'
import type { IMediaState, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function mediaState(): IMediaState {
  return { bridges: new Map(), watchIntent: { index: -1 }, slideAutoplay: () => true }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registerActivationPlayback — contentDeactivate', () => {
  it('leaves non-video content alone', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('video')
    el.pause = vi.fn()
    const data: ISlideData = { key: 'k', type: 'image', src: '' }

    pswp.emit('contentDeactivate', { content: { data, element: el } })

    expect(el.pause).not.toHaveBeenCalled()
  })

  it('pauses the iframe bridge for an embed', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const iframe = document.createElement('iframe')
    const bridge = {
      play: vi.fn(),
      pause: vi.fn(),
      setMuted: vi.fn(),
      onPlaying: vi.fn(),
      destroy: vi.fn()
    }
    state.bridges.set(iframe, bridge)
    const data: ISlideData = { key: 'k', type: 'video', src: '', videoEmbed: 'youtube' }

    pswp.emit('contentDeactivate', { content: { data, element: iframe } })

    expect(bridge.pause).toHaveBeenCalledTimes(1)
  })

  it('no-ops when the element is neither a video nor an iframe', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('div')
    const data: ISlideData = { key: 'k', type: 'video', src: '' }

    expect(() => pswp.emit('contentDeactivate', { content: { data, element: el } })).not.toThrow()
  })
})

describe('registerActivationPlayback — contentActivate', () => {
  it('plays the iframe bridge for an embed', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const iframe = document.createElement('iframe')
    const bridge = {
      play: vi.fn(),
      pause: vi.fn(),
      setMuted: vi.fn(),
      onPlaying: vi.fn(),
      destroy: vi.fn()
    }
    state.bridges.set(iframe, bridge)
    const data: ISlideData = { key: 'k', type: 'video', src: '', videoEmbed: 'youtube' }

    pswp.emit('contentActivate', { content: { data, element: iframe } })

    expect(bridge.play).toHaveBeenCalledTimes(1)
  })

  it('no-ops when the element is neither a video nor an iframe', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('div')
    const data: ISlideData = { key: 'k', type: 'video', src: '' }

    expect(() => pswp.emit('contentActivate', { content: { data, element: el } })).not.toThrow()
  })

  it('arrives unmuted — the viewer asked to watch this', () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('video')
    el.play = vi.fn().mockResolvedValue(undefined)
    const data: ISlideData = { key: 'k', type: 'video', src: '' }

    pswp.emit('contentActivate', { content: { data, element: el } })

    expect(el.play).toHaveBeenCalledTimes(1)
    expect(el.muted).toBe(false)
  })

  it('retries muted when the browser refuses sound, rather than sitting dead', async () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('video')
    const play = vi
      .fn()
      .mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValue(undefined)
    el.play = play
    const data: ISlideData = { key: 'k', type: 'video', src: '' }

    pswp.emit('contentActivate', { content: { data, element: el } })
    await Promise.resolve()
    await Promise.resolve()

    expect(play).toHaveBeenCalledTimes(2)
    expect(el.muted).toBe(true)
  })

  it('gives up quietly when even the muted retry is refused', async () => {
    const pswp = fakePswp()
    const state = mediaState()
    registerActivationPlayback(pswp as unknown as PhotoSwipe, state)
    const el = document.createElement('video')
    el.play = vi.fn().mockRejectedValue(new Error('blocked'))
    const data: ISlideData = { key: 'k', type: 'video', src: '' }

    pswp.emit('contentActivate', { content: { data, element: el } })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(el.play).toHaveBeenCalledTimes(2)
  })
})
