// @vitest-environment happy-dom

import { resolveElementorSource } from '@ts/collector/resolveElementorSource'
import { describe, expect, it } from 'vitest'

function overlay(payload: unknown): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-elementor-open-lightbox', 'yes')
  el.setAttribute('data-elementor-lightbox', JSON.stringify(payload))
  return el
}

describe('resolveElementorSource', () => {
  it('maps the video widget payload onto src, type and aspect dims', () => {
    const source = resolveElementorSource(
      overlay({
        type: 'video',
        videoType: 'youtube',
        url: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?feature=oembed',
        modalOptions: { id: 'elementor-lightbox-abc', videoAspectRatio: '169' }
      })
    )

    expect(source).toEqual({
      src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?feature=oembed',
      type: 'video',
      autoplay: false,
      width: 1600,
      height: 900
    })
  })

  it('keeps autoplay on only for an explicit yes, and reads vertical ratios', () => {
    const on = resolveElementorSource(
      overlay({
        type: 'video',
        url: 'https://example.com/clip.mp4',
        autoplay: 'yes',
        modalOptions: { videoAspectRatio: '916' }
      })
    )
    expect(on?.autoplay).toBe(true)
    expect(on?.width).toBe(900)
    expect(on?.height).toBe(1600)
  })

  it('falls back to 16:9 when the ratio is unknown or absent', () => {
    const source = resolveElementorSource(
      overlay({ type: 'video', url: 'https://example.com/clip.mp4' })
    )
    expect(source?.width).toBe(1600)
    expect(source?.height).toBe(900)
  })

  it('reads the Pro Media Carousel video marker — the href is only the poster', () => {
    document.body.innerHTML = `
      <a
        href="https://example.com/poster.jpg"
        data-elementor-open-lightbox="yes"
        data-elementor-lightbox-video="https://www.youtube.com/embed/aqz-KE-bpKQ"
        data-elementor-lightbox-slideshow="w7"
      ><img src="thumb.jpg" alt="" /></a>
    `
    const el = document.querySelector('a') as HTMLElement
    const source = resolveElementorSource(el)
    expect(source).toEqual({
      src: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
      type: 'video',
      width: 1600,
      height: 900
    })
  })

  it('returns null for malformed JSON, non-video payloads and absent attributes', () => {
    const broken = document.createElement('div')
    broken.setAttribute('data-elementor-lightbox', '{not json')
    expect(resolveElementorSource(broken)).toBeNull()

    expect(resolveElementorSource(overlay({ type: 'template', url: 'x' }))).toBeNull()
    expect(resolveElementorSource(overlay({ type: 'video' }))).toBeNull()
    expect(resolveElementorSource(document.createElement('div'))).toBeNull()
  })
})
