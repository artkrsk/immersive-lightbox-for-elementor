import { ATTR_CAPTION, ATTR_HEIGHT, ATTR_HTML, ATTR_ID, ATTR_TYPE, ATTR_WIDTH } from '../constants'
import type { ISlideData } from '../interfaces'
import { normalizeUrlKey } from '../utils'
import { detectSlideType } from './detectSlideType'
import { detectVideoEmbed } from './detectVideoEmbed'

function readDimension(
  el: HTMLElement,
  attr: string,
  img: HTMLImageElement | null,
  imgAttr: string
): number | undefined {
  const explicit = Number.parseInt(el.getAttribute(attr) ?? '', 10)
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit
  }
  const fallback = Number.parseInt(img?.getAttribute(imgAttr) ?? '', 10)
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

/** Reads one candidate element into the engine's slide model. */
export function extractSlideData(el: HTMLElement): ISlideData {
  const href = el.getAttribute('href') ?? ''
  const type = detectSlideType(href, el.getAttribute(ATTR_TYPE))
  const img = el.querySelector('img')
  const data: ISlideData = {
    key: el.getAttribute(ATTR_ID) ?? normalizeUrlKey(href, el.ownerDocument.baseURI),
    type,
    src: href
  }
  const width = readDimension(el, ATTR_WIDTH, img, 'width')
  const height = readDimension(el, ATTR_HEIGHT, img, 'height')
  if (width !== undefined) {
    data.width = width
  }
  if (height !== undefined) {
    data.height = height
  }
  const msrc = img?.currentSrc || img?.getAttribute('src') || undefined
  if (msrc) {
    data.msrc = msrc
  }
  const caption = readCaption(el, img)
  if (caption) {
    data.caption = caption
  }
  if (type === 'video') {
    data.videoSrc = href
    data.videoEmbed = detectVideoEmbed(href)
  }
  if (type === 'html') {
    const selector = el.getAttribute(ATTR_HTML)
    const source = selector ? el.ownerDocument.querySelector(selector) : null
    if (source) {
      data.html = source.innerHTML
    }
  }
  return data
}
