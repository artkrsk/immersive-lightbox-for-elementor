import { buildEmbedUrl } from '@ts/video/buildEmbedUrl'
import { parseVideoUrl } from '@ts/video/parseVideoUrl'
import { describe, expect, it } from 'vitest'

describe('buildEmbedUrl — YouTube', () => {
  const source = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90')
  if (!source) {
    throw new Error('fixture parse failed')
  }

  it('builds a privacy-first controllable embed', () => {
    const url = buildEmbedUrl(source)
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(url).toContain('enablejsapi=1')
    expect(url).toContain('playsinline=1')
    expect(url).toContain('rel=0')
    expect(url).toContain('start=90')
  })

  it('NEVER emits autoplay unless explicitly asked (the AGC-bug pin)', () => {
    expect(buildEmbedUrl(source)).not.toContain('autoplay')
    expect(buildEmbedUrl(source, { autoplay: true })).toContain('autoplay=1')
  })
})

describe('buildEmbedUrl — Vimeo', () => {
  it('carries the private hash and privacy params', () => {
    const source = parseVideoUrl('https://vimeo.com/617673871/701316cc64')
    if (!source) {
      throw new Error('fixture parse failed')
    }
    const url = buildEmbedUrl(source)
    expect(url).toContain('player.vimeo.com/video/617673871')
    expect(url).toContain('h=701316cc64')
    expect(url).toContain('dnt=1')
    expect(url).toContain('playsinline=1')
    expect(url).not.toContain('autoplay')
    expect(buildEmbedUrl(source, { autoplay: true })).toContain('autoplay=1')
  })
})
