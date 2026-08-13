// @vitest-environment happy-dom

import type { ISlideData } from '@ts/interfaces'
import { buildVideoElement } from '@ts/video/buildVideoElement'
import { describe, expect, it } from 'vitest'

const base: ISlideData = { key: 'k', type: 'video', src: '' }

describe('buildVideoElement', () => {
  it('builds a native player for self-hosted files', () => {
    const el = buildVideoElement(
      {
        ...base,
        src: 'https://example.com/clip.mp4',
        videoSrc: 'https://example.com/clip.mp4',
        videoEmbed: null
      },
      { autoplay: false }
    )
    expect(el.tagName).toBe('VIDEO')
    expect(el.getAttribute('src')).toBe('https://example.com/clip.mp4')
    expect(el.hasAttribute('controls')).toBe(true)
    expect(el.hasAttribute('playsinline')).toBe(true)
    expect((el as HTMLVideoElement).autoplay).toBe(false)
  })

  it('never sets the autoplay property on files, even for the opened slide', () => {
    // The property sticks to the element and re-fires on every re-append —
    // including when the slide later re-enters the preload window as a
    // neighbor (the AGC bug). The opened slide plays via contentActivate.
    const el = buildVideoElement(
      {
        ...base,
        src: 'https://example.com/clip.mp4',
        videoSrc: 'https://example.com/clip.mp4',
        videoEmbed: null
      },
      { autoplay: true }
    )
    expect((el as HTMLVideoElement).autoplay).toBe(false)
  })

  it('builds a nocookie iframe for YouTube', () => {
    const el = buildVideoElement(
      {
        ...base,
        src: 'https://youtu.be/dQw4w9WgXcQ',
        videoSrc: 'https://youtu.be/dQw4w9WgXcQ',
        videoEmbed: 'youtube'
      },
      { autoplay: false }
    )
    expect(el.tagName).toBe('IFRAME')
    expect(el.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(el.getAttribute('src')).toContain('enablejsapi=1')
    expect(el.getAttribute('allow')).toContain('autoplay')
    expect(el.dataset.artsCleanSrc).toBeUndefined()
  })

  it('stamps the disarmed URL on armed embeds for re-append swaps', () => {
    const el = buildVideoElement(
      {
        ...base,
        src: 'https://youtu.be/dQw4w9WgXcQ',
        videoSrc: 'https://youtu.be/dQw4w9WgXcQ',
        videoEmbed: 'youtube'
      },
      { autoplay: true }
    )
    expect(el.getAttribute('src')).toContain('autoplay=1')
    expect(el.dataset.artsCleanSrc).not.toContain('autoplay')
  })

  it('builds a player iframe for Vimeo', () => {
    const el = buildVideoElement(
      {
        ...base,
        src: 'https://vimeo.com/76979871',
        videoSrc: 'https://vimeo.com/76979871',
        videoEmbed: 'vimeo'
      },
      { autoplay: false }
    )
    expect(el.tagName).toBe('IFRAME')
    expect(el.getAttribute('src')).toContain('player.vimeo.com/video/76979871')
    expect(el.getAttribute('src')).toContain('api=1')
  })
})
