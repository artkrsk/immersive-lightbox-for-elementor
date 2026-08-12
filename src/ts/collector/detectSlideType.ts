import type { TSlideType } from '../types'
import { parseVideoUrl } from '../video/parseVideoUrl'

/** Slide type from the href, unless an explicit type attribute overrides. */
export function detectSlideType(href: string, explicit?: string | null): TSlideType {
  if (explicit === 'image' || explicit === 'video' || explicit === 'html') {
    return explicit
  }
  return parseVideoUrl(href) ? 'video' : 'image'
}
