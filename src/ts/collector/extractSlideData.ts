import {
  ATTR_AUTOPLAY,
  ATTR_CAPTION,
  ATTR_DESCRIPTION,
  ATTR_HEIGHT,
  ATTR_HTML,
  ATTR_ID,
  ATTR_LIGHTBOX,
  ATTR_THUMB,
  ATTR_TYPE,
  ATTR_WIDTH
} from '../constants'
import {
  ELEMENTOR_ATTR_DESCRIPTION,
  ELEMENTOR_ATTR_LIGHTBOX_VIDEO,
  ELEMENTOR_ATTR_TITLE
} from '../constants/elementorAttributes'
import type { ISlideData } from '../interfaces'
import { normalizeUrlKey } from '../utils'
import { parseVideoUrl } from '../video/parseVideoUrl'
import { posterUrl } from '../video/posterUrl'
import { detectSlideType } from './detectSlideType'
import { detectVideoEmbed } from './detectVideoEmbed'
import { resolveElementorSource } from './resolveElementorSource'

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
  // Elementor resolves its lightbox_title_src kit setting server-side into
  // this attribute, so reading it inherits that setting for free.
  const elementorTitle = el.getAttribute(ELEMENTOR_ATTR_TITLE)?.trim()
  if (elementorTitle) {
    return elementorTitle
  }
  const figcaption = el.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
  if (figcaption) {
    return figcaption
  }
  const alt = img?.getAttribute('alt')?.trim()
  return alt || undefined
}

/**
 * The second caption line. Explicit only — ours, then the one Elementor
 * stamps from its lightbox_description_src setting. Nothing in the DOM is a
 * plausible description the way a figcaption or an alt is a caption.
 */
function readDescription(el: HTMLElement): string | undefined {
  const attr = el.getAttribute(ATTR_DESCRIPTION)?.trim()
  if (attr) {
    return attr
  }
  return el.getAttribute(ELEMENTOR_ATTR_DESCRIPTION)?.trim() || undefined
}

/** The low-res stand-in painted before the full source loads. An author's
 *  own thumbnail wins — a text trigger (a title, a button) wraps no media to
 *  borrow one from, so it names its own. */
function readMsrc(
  el: HTMLElement,
  img: HTMLImageElement | null,
  video: HTMLVideoElement | null
): string | undefined {
  return (
    el.getAttribute(ATTR_THUMB)?.trim() ||
    img?.currentSrc ||
    img?.getAttribute('src') ||
    video?.poster ||
    video?.getAttribute('poster') ||
    captureVideoFrame(video) ||
    undefined
  )
}

/** Longest edge of a frame captured off a wrapped <video>. */
const CAPTURED_FRAME_EDGE = 320

/**
 * A wrapped <video> with no poster still shows a picture on the page — the
 * frame it is on. Galleries are built at click time, so the frame is decoded
 * by then; a same-origin file draws, a cross-origin one taints the canvas and
 * the catch hands the tile back to its play glyph.
 */
function captureVideoFrame(video: HTMLVideoElement | null): string | undefined {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return undefined
  }
  try {
    const scale = Math.min(1, CAPTURED_FRAME_EDGE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = video.ownerDocument.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    // The canvas is detached and short-lived, but its bitmap counts against the
    // page's canvas memory until GC (Safari budgets it) — release it now rather
    // than one capture per click later.
    canvas.width = 0
    canvas.height = 0
    return dataUrl
  } catch {
    return undefined
  }
}

/**
 * Dims: explicit attrs win; then the thumb img; then the video element's
 * intrinsic width/height attributes (well-behaved themes print them).
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

function readVideoData(data: ISlideData, el: HTMLElement): void {
  data.videoSrc = data.src
  data.videoEmbed = detectVideoEmbed(data.src)
  const parsed = parseVideoUrl(data.src)
  if (parsed?.id) {
    data.videoId = parsed.id
  }
  if (parsed?.hash) {
    data.videoHash = parsed.hash
  }
  if (parsed?.start !== undefined) {
    data.videoStart = parsed.start
  }
  // A hosted video usually has no image to borrow — a plain link to YouTube
  // carries nothing at all — so derive one from the id. Only when the trigger
  // gave us nothing: an author's own thumbnail always wins.
  if (!data.msrc && parsed) {
    const poster = posterUrl(parsed)
    if (poster) {
      data.msrc = poster
    }
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

// A candidate's own source is its href. Elementor's structured payloads are
// consulted only when our own vocabulary yields nothing: ours always wins,
// enforced structurally rather than by attribute priority.
// An action-hash href is a payload carrier, never a source itself; the
// Pro Media Carousel video marker outranks the href outright — that href
// is only the poster — unless our own vocabulary claimed the element.
function resolveSource(el: HTMLElement) {
  const href = el.getAttribute('href') ?? ''
  const hrefSrc = href.startsWith('#elementor-action') ? '' : href
  const ownSrc = hrefSrc
  const markerWins =
    !el.hasAttribute(ATTR_LIGHTBOX) && el.hasAttribute(ELEMENTOR_ATTR_LIGHTBOX_VIDEO)
  const elementor = !ownSrc || markerWins ? resolveElementorSource(el) : null
  const src = elementor?.src || ownSrc || ''
  return { src, hrefSrc, markerWins, elementor }
}

// After readDims: a payload's declared aspect is authoritative over
// whatever the poster <img> attributes would have guessed. Image payloads
// declare none — their thumb guess + natural upgrade stands.
function applyElementorOverrides(
  data: ISlideData,
  elementor: ReturnType<typeof resolveElementorSource>
): void {
  if (!elementor) {
    return
  }
  if (elementor.width !== undefined && elementor.height !== undefined) {
    data.width = elementor.width
    data.height = elementor.height
  }
  if (elementor.autoplay === false) {
    data.autoplay = false
  }
}

/** Reads one candidate element into the engine's slide model. */
export function extractSlideData(el: HTMLElement): ISlideData {
  const img = el.querySelector('img')
  const containedVideo = el.querySelector('video')
  const { src, hrefSrc, markerWins, elementor } = resolveSource(el)
  const data: ISlideData = {
    key: el.getAttribute(ATTR_ID) ?? normalizeUrlKey(src, el.ownerDocument.baseURI),
    type: elementor ? elementor.type : detectSlideType(src, el.getAttribute(ATTR_TYPE)),
    src
  }
  // A trigger <img> on a VIDEO slide is a poster, not the player: its aspect
  // describes the still the author picked, and a portrait photo hung on a
  // Vimeo link boxed the embed in portrait, where the player letterboxed
  // itself. A wrapped <video> still counts — that IS the thing being opened.
  readDims(data, el, data.type === 'video' ? containedVideo : (img ?? containedVideo))
  applyElementorOverrides(data, elementor)
  // No dims from anywhere (background-image div slides, SVG attachments
  // without WP meta): mark guessed with NO interim here — extraction records
  // truth, the mapping layer supplies pswp's required box, and the natural
  // upgrade corrects box AND aspect on load.
  if (data.type === 'image' && (!data.width || !data.height)) {
    data.dimsGuessed = true
  }
  const msrc = readMsrc(el, img, containedVideo)
  if (msrc) {
    data.msrc = msrc
  }
  // The marker anchor's href IS the poster — an author-chosen placeholder,
  // set before the video path can derive a generic one from the embed id.
  if (!data.msrc && markerWins && hrefSrc) {
    data.msrc = hrefSrc
  }
  const caption = readCaption(el, img)
  if (caption) {
    data.caption = caption
  }
  const description = readDescription(el)
  if (description) {
    data.description = description
  }
  if (data.type === 'video') {
    readVideoData(data, el)
  }
  if (data.type === 'html') {
    readHtmlData(data, el)
  }
  return data
}
