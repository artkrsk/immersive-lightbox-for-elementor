import type { TVideoSource } from '../types'

/**
 * A thumbnail for a hosted video, derived from its id alone — no network call
 * and no API key, so it costs nothing until an <img> actually asks for it.
 *
 * `i.ytimg.com` rather than `img.youtube.com`: it is Google's cookieless
 * static image host, which keeps this consistent with the nocookie embed URL
 * built next door. The request still discloses an IP, as any third-party asset
 * does, but it sets no identifiers.
 *
 * `mqdefault` rather than the larger variants because it is the only size that
 * is both always generated AND true 16:9 — `hqdefault` and `sddefault` are 4:3
 * with letterbox bars baked in, which a square thumbnail would crop to a band
 * of black, and `maxresdefault` does not exist for every video.
 *
 * Vimeo has no id-derivable URL: it needs an oEmbed round trip, which is a
 * different shape of solution and deliberately not attempted here.
 */
export function posterUrl(source: TVideoSource): string | undefined {
  if (source.provider === 'youtube' && source.id) {
    return `https://i.ytimg.com/vi/${source.id}/mqdefault.jpg`
  }
  return undefined
}
