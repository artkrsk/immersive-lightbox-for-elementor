import { VIMEO_PATTERN, YOUTUBE_PATTERN } from '../constants'
import type { TVideoEmbed } from '../types'

/** Hosted-video provider from the href; null = self-hosted file. */
export function detectVideoEmbed(href: string): TVideoEmbed {
  if (YOUTUBE_PATTERN.test(href)) {
    return 'youtube'
  }
  if (VIMEO_PATTERN.test(href)) {
    return 'vimeo'
  }
  return null
}
