import type { TVideoEmbed } from '../types'
import { parseVideoUrl } from '../video/parseVideoUrl'

/** Hosted-video provider from the href; null = self-hosted file. */
export function detectVideoEmbed(href: string): TVideoEmbed {
  const source = parseVideoUrl(href)
  if (source?.provider === 'youtube' || source?.provider === 'vimeo') {
    return source.provider
  }
  return null
}
