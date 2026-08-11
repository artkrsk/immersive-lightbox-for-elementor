import type { TSlideType } from '../types/TSlideType'
import type { TVideoEmbed } from '../types/TVideoEmbed'

/**
 * The engine's slide model — a superset mapped onto PhotoSwipe's SlideData.
 * `key` is the canonical identity used for clone dedup: an explicit
 * data-arts-lightbox-id when present, otherwise the normalized full-size URL.
 */
export interface ISlideData {
  key: string
  type: TSlideType
  /** Full-size URL (the anchor's href). */
  src: string
  width?: number
  height?: number
  /** Thumbnail currentSrc, used as the PhotoSwipe placeholder. */
  msrc?: string
  caption?: string
  /** html slides: content resolved from the referenced selector. */
  html?: string
  videoSrc?: string
  videoEmbed?: TVideoEmbed
}
