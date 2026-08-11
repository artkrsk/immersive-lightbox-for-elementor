import { VIDEO_FILE_PATTERN, VIMEO_PATTERN, YOUTUBE_PATTERN } from '../constants'
import type { TSlideType } from '../types'

/** Slide type from the href, unless an explicit type attribute overrides. */
export function detectSlideType(href: string, explicit?: string | null): TSlideType {
  if (explicit === 'image' || explicit === 'video' || explicit === 'html') {
    return explicit
  }
  if (VIDEO_FILE_PATTERN.test(href) || YOUTUBE_PATTERN.test(href) || VIMEO_PATTERN.test(href)) {
    return 'video'
  }
  return 'image'
}
