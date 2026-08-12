import type { TVideoSource } from '../types'

/**
 * Embed URL for a parsed provider source. Privacy-first (nocookie / dnt),
 * API-controllable (enablejsapi — the player bridge needs it), inline-safe.
 *
 * Autoplay is NEVER emitted unless explicitly asked: PhotoSwipe preloads
 * neighbor slides into the DOM, and autoplay baked into their URLs makes
 * them all play at once (the ArtsCustomGallery production bug). Only the
 * actually-opened slide may ask for it.
 */
export function buildEmbedUrl(source: TVideoSource, opts: { autoplay?: boolean } = {}): string {
  if (source.provider === 'youtube') {
    const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', rel: '0' })
    if (source.start) {
      params.set('start', String(source.start))
    }
    if (opts.autoplay) {
      params.set('autoplay', '1')
    }
    return `https://www.youtube-nocookie.com/embed/${source.id}?${params.toString()}`
  }
  if (source.provider === 'vimeo') {
    const params = new URLSearchParams({ dnt: '1', playsinline: '1' })
    if (source.hash) {
      params.set('h', source.hash)
    }
    if (opts.autoplay) {
      params.set('autoplay', '1')
    }
    return `https://player.vimeo.com/video/${source.id}?${params.toString()}`
  }
  return ''
}
