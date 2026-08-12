import type { TSlideType } from '../types/TSlideType'
import type { TVideoEmbed } from '../types/TVideoEmbed'
import type { IAdoptedVideo } from './IAdoptedVideo'

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
  /** Dims came from the thumb's attributes — upgrade from naturals on load. */
  dimsGuessed?: boolean
  /** Thumbnail currentSrc, used as the PhotoSwipe placeholder. */
  msrc?: string
  caption?: string
  /** html slides: content resolved from the referenced selector. */
  html?: string
  videoSrc?: string
  videoEmbed?: TVideoEmbed
  /** Vimeo private-access hash — required for unlisted videos. */
  videoHash?: string
  /** Start offset in seconds (YouTube t=/start=). */
  videoStart?: number
  /** The src came from a <video> contained in the candidate element. */
  sourceVideo?: boolean
  /** Per-slide autoplay opt-out (data-arts-lightbox-autoplay="false"). */
  autoplay?: boolean
  /** Resolved at open: the page video adopted for this slide (tier 1). */
  adopted?: IAdoptedVideo
  /** Resolved at open: hidden/managed page video to clone-and-seek (tier 2). */
  cloneSource?: HTMLVideoElement
}
