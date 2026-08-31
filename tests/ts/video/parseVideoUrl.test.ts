import { parseVideoUrl } from '@ts/video/parseVideoUrl'
import { describe, expect, it } from 'vitest'

describe('parseVideoUrl — YouTube', () => {
  const ID = 'dQw4w9WgXcQ'
  const forms: Array<[string, string]> = [
    ['watch', `https://www.youtube.com/watch?v=${ID}`],
    ['watch with extra params', `https://www.youtube.com/watch?list=PLx&v=${ID}&t=30`],
    ['short link', `https://youtu.be/${ID}`],
    ['short link bare', `youtu.be/${ID}`],
    ['embed', `https://www.youtube.com/embed/${ID}`],
    ['nocookie embed', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['shorts', `https://www.youtube.com/shorts/${ID}?feature=share`],
    ['live', `https://www.youtube.com/live/${ID}`],
    ['legacy /v/', `https://www.youtube.com/v/${ID}`],
    ['mobile', `https://m.youtube.com/watch?v=${ID}`]
  ]
  for (const [name, url] of forms) {
    it(`parses ${name}`, () => {
      const parsed = parseVideoUrl(url)
      expect(parsed?.provider).toBe('youtube')
      expect(parsed?.id).toBe(ID)
    })
  }

  it('rejects the playlist-embed pseudo-id', () => {
    // "videoseries" is exactly 11 characters — the id shape alone lets it pass
    expect(parseVideoUrl('https://www.youtube.com/embed/videoseries?list=PLabc')).toBeNull()
  })

  it('parses timestamps in both forms', () => {
    expect(parseVideoUrl(`https://youtu.be/${ID}?t=90`)?.start).toBe(90)
    expect(parseVideoUrl(`https://www.youtube.com/watch?v=${ID}&t=1m30s`)?.start).toBe(90)
    expect(parseVideoUrl(`https://www.youtube.com/watch?v=${ID}&start=45`)?.start).toBe(45)
    expect(parseVideoUrl(`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`)?.start).toBe(3723)
  })
})

describe('parseVideoUrl — Vimeo', () => {
  it('parses the plain and player forms', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      id: '76979871'
    })
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871')?.id).toBe('76979871')
    expect(parseVideoUrl('https://www.vimeo.com/76979871')?.id).toBe('76979871')
  })

  it('parses channels and groups forms', () => {
    expect(parseVideoUrl('https://vimeo.com/channels/staffpicks/76979871')?.id).toBe('76979871')
    expect(parseVideoUrl('https://vimeo.com/groups/shortfilms/videos/76979871')?.id).toBe(
      '76979871'
    )
  })

  it('parses the dashboard, showcase, album and on-demand forms', () => {
    const forms = [
      'https://vimeo.com/manage/videos/76979871',
      'https://vimeo.com/showcase/7654321/video/76979871',
      'https://vimeo.com/album/2222222/video/76979871',
      'https://vimeo.com/ondemand/somefilm/76979871',
      'https://vimeo.com/user12345/video/76979871'
    ]
    for (const url of forms) {
      expect(parseVideoUrl(url)?.id, url).toBe('76979871')
    }
  })

  it('captures the private hash in both forms', () => {
    const path = parseVideoUrl('https://vimeo.com/617673871/701316cc64')
    expect(path).toEqual({ provider: 'vimeo', id: '617673871', hash: '701316cc64' })
    const param = parseVideoUrl('https://player.vimeo.com/video/617673871?h=701316cc64')
    expect(param?.hash).toBe('701316cc64')
    const player = parseVideoUrl('https://player.vimeo.com/video/617673871/701316cc64')
    expect(player?.hash).toBe('701316cc64')
  })

  it('does not mistake a trailing path word for the hash', () => {
    // a bogus h= makes Vimeo refuse to play an otherwise public video
    expect(parseVideoUrl('https://vimeo.com/76979871/likes')).toEqual({
      provider: 'vimeo',
      id: '76979871'
    })
    expect(parseVideoUrl('https://vimeo.com/76979871/settings')?.hash).toBeUndefined()
  })
})

describe('parseVideoUrl — files and rejections', () => {
  it('detects video files by extension, query-tolerant', () => {
    expect(parseVideoUrl('https://example.com/clip.mp4')).toEqual({ provider: 'file' })
    expect(parseVideoUrl('https://example.com/clip.webm?x=1')).toEqual({ provider: 'file' })
    expect(parseVideoUrl('https://example.com/clip.m4v#frag')).toEqual({ provider: 'file' })
  })

  it('returns null for non-video URLs', () => {
    expect(parseVideoUrl('https://example.com/photo.jpg')).toBeNull()
    expect(parseVideoUrl('https://example.com/page')).toBeNull()
    expect(parseVideoUrl('')).toBeNull()
    // a video-looking path on a YouTube domain is still YouTube-or-nothing
    expect(parseVideoUrl('https://www.youtube.com/playlist?list=PLabc')).toBeNull()
  })
})
