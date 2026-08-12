// @vitest-environment happy-dom

import { buildVideoElement } from '@ts/content/buildVideoElement'
import { fitWithin } from '@ts/content/fitWithin'
import type { ISlideData } from '@ts/interfaces'
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
  })
})

describe('fitWithin', () => {
  it('contains by width when the area is taller than the aspect', () => {
    expect(fitWithin({ x: 1000, y: 800 }, 16 / 9)).toEqual({ w: 1000, h: 562.5 })
  })

  it('contains by height when the area is wider than the aspect', () => {
    expect(fitWithin({ x: 2000, y: 450 }, 16 / 9)).toEqual({ w: 800, h: 450 })
  })
})
