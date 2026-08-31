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
  /** Dims aren't author-declared (thumb-guessed, or absent) — upgrade on load. */
  dimsGuessed?: boolean
  /** Thumbnail currentSrc, used as the PhotoSwipe placeholder. */
  msrc?: string
  /** The caption's title line. */
  caption?: string
  /** The caption's second line — always explicit, never scraped from the DOM. */
  description?: string
  /** html slides: content resolved from the referenced selector. */
  html?: string
  videoSrc?: string
  videoEmbed?: TVideoEmbed
  /** The provider's own id, as the embed URL and the poster lookup want it. */
  videoId?: string
  /** Vimeo private-access hash — required for unlisted videos. */
  videoHash?: string
  /** Start offset in seconds (YouTube t=/start=). */
  videoStart?: number
  /** Per-slide autoplay opt-out (data-arts-lightbox-autoplay="false"). */
  autoplay?: boolean
}
