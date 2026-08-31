import {
  ELEMENTOR_ATTR_LIGHTBOX_JSON,
  ELEMENTOR_ATTR_LIGHTBOX_VIDEO
} from '../constants/elementorAttributes'
import type { TSlideType } from '../types/TSlideType'
import { decodeActionHash } from './decodeActionHash'
import { detectSlideType } from './detectSlideType'

// Elementor's aspect_ratio control values are the two ratio terms
// concatenated; scaled to ~1000-unit layout dims for a fit-only slide.
const WIDESCREEN: [number, number] = [1600, 900]
const ASPECT_DIMS: Record<string, [number, number]> = {
  '169': WIDESCREEN,
  '916': [900, 1600],
  '43': [1333, 1000],
  '32': [1500, 1000],
  '11': [1000, 1000],
  '219': [2100, 900]
}

interface IResolved {
  src: string
  type: TSlideType
  autoplay?: boolean
  width?: number
  height?: number
}

function fromVideoPayload(data: Record<string, unknown>): IResolved | null {
  if (typeof data.url !== 'string' || !data.url) {
    return null
  }
  const modal = (data.modalOptions ?? {}) as Record<string, unknown>
  const ratio = typeof modal.videoAspectRatio === 'string' ? modal.videoAspectRatio : ''
  const [width, height] = ASPECT_DIMS[ratio] ?? WIDESCREEN
  return {
    src: data.url,
    type: 'video',
    // A switcher: 'yes' when on, '' when off. Absent means off — the native
    // lightbox only autoplays when the widget asked for it.
    autoplay: data.autoplay === 'yes' || data.autoplay === true,
    width,
    height
  }
}

function fromJsonAttribute(raw: string): IResolved | null {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof payload !== 'object' || payload === null) {
    return null
  }
  const data = payload as Record<string, unknown>
  return data.type === 'video' ? fromVideoPayload(data) : null
}

function fromActionHash(href: string): IResolved | null {
  const hash = decodeActionHash(href)
  if (!hash) {
    return null
  }
  if (hash.type === 'video') {
    return fromVideoPayload(hash)
  }
  if (typeof hash.url === 'string' && hash.url) {
    // The image payload carries no type field — detect from the URL, and
    // no dims: the trigger's own thumb (when present) guesses them, and
    // the natural upgrade corrects on load, same as any thumbed anchor.
    return { src: hash.url, type: detectSlideType(hash.url, null) }
  }
  return null
}

/**
 * Elementor's structured lightbox payloads, parsed rather than re-derived.
 * Two carriers: the Video widget's overlay div (`data-elementor-lightbox`
 * JSON — embed/hosted URL, autoplay, aspect ratio) and the action-hash deep
 * link (image `{id, url, slideshow?}` or the same video options). Null for
 * anything unusable; the collector drops such candidates instead of
 * building a blank slide.
 */
export function resolveElementorSource(el: HTMLElement): IResolved | null {
  // Pro Media Carousel video slides: the marker attribute IS the video
  // signal (Elementor's own reader keys on exactly this), href = poster.
  const markerVideo = el.getAttribute(ELEMENTOR_ATTR_LIGHTBOX_VIDEO)
  if (markerVideo) {
    const [width, height] = WIDESCREEN
    return { src: markerVideo, type: 'video', width, height }
  }
  const raw = el.getAttribute(ELEMENTOR_ATTR_LIGHTBOX_JSON)
  if (raw) {
    return fromJsonAttribute(raw)
  }
  return fromActionHash(el.getAttribute('href') ?? '')
}
