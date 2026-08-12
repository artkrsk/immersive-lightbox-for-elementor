import {
  ATTR_AUTOPLAY,
  ATTR_CAPTION,
  ATTR_HEIGHT,
  ATTR_HTML,
  ATTR_ID,
  ATTR_TYPE,
  ATTR_WIDTH
} from '../constants'
import type { ISlideData } from '../interfaces'
import { normalizeUrlKey } from '../utils'
import { parseVideoUrl } from '../video/parseVideoUrl'
import { detectSlideType } from './detectSlideType'
import { detectVideoEmbed } from './detectVideoEmbed'

function readDimension(
  el: HTMLElement,
  attr: string,
  media: HTMLElement | null,
  mediaAttr: string
): number | undefined {
  const explicit = Number.parseInt(el.getAttribute(attr) ?? '', 10)
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit
  }
  const fallback = Number.parseInt(media?.getAttribute(mediaAttr) ?? '', 10)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : undefined
}

function readCaption(el: HTMLElement, img: HTMLImageElement | null): string | undefined {
  const attr = el.getAttribute(ATTR_CAPTION)
  if (attr) {
    return attr
  }
  const figcaption = el.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
  if (figcaption) {
    return figcaption
  }
  const alt = img?.getAttribute('alt')?.trim()
  return alt || undefined
}

/** The low-res stand-in painted before the full source loads. */
function readMsrc(
  img: HTMLImageElement | null,
  video: HTMLVideoElement | null
): string | undefined {
  return (
    img?.currentSrc ||
    img?.getAttribute('src') ||
    video?.poster ||
    video?.getAttribute('poster') ||
    undefined
  )
}

/**
 * Dims: explicit attrs win; then the thumb img; then the video element's
 * intrinsic width/height attributes (Velum's media partial prints them).
 * Thumb attributes carry the right aspect but the WRONG scale for the
 * full-size file — PhotoSwipe would cap zoom at "natural" thumb size, so
 * guessed dims are flagged for the content layer's natural upgrade.
 */
function readDims(data: ISlideData, el: HTMLElement, media: HTMLElement | null): void {
  const explicitW = Number.parseInt(el.getAttribute(ATTR_WIDTH) ?? '', 10)
  const width = readDimension(el, ATTR_WIDTH, media, 'width')
  const height = readDimension(el, ATTR_HEIGHT, media, 'height')
  if (width !== undefined) {
    data.width = width
  }
  if (height !== undefined) {
    data.height = height
  }
  if (
    data.type === 'image' &&
    width !== undefined &&
    !(Number.isFinite(explicitW) && explicitW > 0)
  ) {
    data.dimsGuessed = true
  }
}

function readVideoData(
  data: ISlideData,
  el: HTMLElement,
  href: string,
  containedVideo: HTMLVideoElement | null
): void {
  data.videoSrc = data.src
  data.videoEmbed = detectVideoEmbed(data.src)
  const parsed = parseVideoUrl(data.src)
  if (parsed?.hash) {
    data.videoHash = parsed.hash
  }
  if (parsed?.start !== undefined) {
    data.videoStart = parsed.start
  }
  if (!href && containedVideo) {
    data.sourceVideo = true
  }
  if (el.getAttribute(ATTR_AUTOPLAY) === 'false') {
    data.autoplay = false
  }
}

function readHtmlData(data: ISlideData, el: HTMLElement): void {
  const selector = el.getAttribute(ATTR_HTML)
  const source = selector ? el.ownerDocument.querySelector(selector) : null
  if (source) {
    data.html = source.innerHTML
  }
}

/** Reads one candidate element into the engine's slide model. */
export function extractSlideData(el: HTMLElement): ISlideData {
  const href = el.getAttribute('href') ?? ''
  const img = el.querySelector('img')
  const containedVideo = el.querySelector('video')
  // Non-anchor candidates (background video widgets) carry no href — their
  // source is the contained <video> element itself.
  const src = href || containedVideo?.currentSrc || containedVideo?.getAttribute('src') || ''
  const data: ISlideData = {
    key: el.getAttribute(ATTR_ID) ?? normalizeUrlKey(src, el.ownerDocument.baseURI),
    type: detectSlideType(src, el.getAttribute(ATTR_TYPE)),
    src
  }
  readDims(data, el, img ?? containedVideo)
  const msrc = readMsrc(img, containedVideo)
  if (msrc) {
    data.msrc = msrc
  }
  const caption = readCaption(el, img)
  if (caption) {
    data.caption = caption
  }
  if (data.type === 'video') {
    readVideoData(data, el, href, containedVideo)
  }
  if (data.type === 'html') {
    readHtmlData(data, el)
  }
  return data
}
