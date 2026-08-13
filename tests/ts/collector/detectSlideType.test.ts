import { detectSlideType } from '@ts/collector/detectSlideType'
import { detectVideoEmbed } from '@ts/collector/detectVideoEmbed'
import { describe, expect, it } from 'vitest'

describe('detectSlideType', () => {
  it('detects images by default', () => {
    expect(detectSlideType('https://example.com/photo.jpg')).toBe('image')
    expect(detectSlideType('https://example.com/photo.webp?w=1200')).toBe('image')
  })

  it('detects video files by extension', () => {
    expect(detectSlideType('https://example.com/clip.mp4')).toBe('video')
    expect(detectSlideType('https://example.com/clip.webm?x=1')).toBe('video')
    expect(detectSlideType('https://example.com/clip.mov')).toBe('video')
  })

  it('detects embed providers as video', () => {
    expect(detectSlideType('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('video')
    expect(detectSlideType('https://youtu.be/dQw4w9WgXcQ')).toBe('video')
    expect(detectSlideType('https://vimeo.com/76979871')).toBe('video')
  })

  it('lets an explicit type win over the href', () => {
    expect(detectSlideType('https://example.com/clip.mp4', 'image')).toBe('image')
    expect(detectSlideType('https://example.com/anything', 'html')).toBe('html')
    expect(detectSlideType('https://example.com/photo.jpg', 'video')).toBe('video')
  })
})

describe('detectVideoEmbed', () => {
  it('identifies the provider', () => {
    expect(detectVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
    expect(detectVideoEmbed('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectVideoEmbed('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectVideoEmbed('https://vimeo.com/76979871')).toBe('vimeo')
    expect(detectVideoEmbed('https://example.com/clip.mp4')).toBeNull()
  })
})
