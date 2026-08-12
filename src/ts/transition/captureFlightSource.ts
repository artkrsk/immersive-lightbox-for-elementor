import type { IFlightSource } from '../interfaces'

const CLIPS = /hidden|clip|scroll|auto/

/** Nearest clipping ancestor from `walkStart` up to and including
 *  `sourceEl` — the box the user actually SEES. */
function findClipBox(walkStart: HTMLElement, sourceEl: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = walkStart
  while (el) {
    if (CLIPS.test(getComputedStyle(el).overflow)) {
      return el
    }
    if (el === sourceEl) {
      return null
    }
    el = el.parentElement
  }
  return null
}

/** An img-mode flight needs an IMAGE source: the img's own src, or a
 *  video's poster (a video file URL painted into an <img> shows nothing). */
function mediaSrc(img: HTMLImageElement | HTMLVideoElement | null): string {
  if (img instanceof HTMLVideoElement) {
    return img.poster || img.getAttribute('poster') || ''
  }
  return img?.currentSrc || img?.getAttribute('src') || ''
}

/** The inner media's geometry relative to the frame — parallax measured as
 *  rects, so any mechanism (transform, translate/scale properties, inline
 *  styles) is captured identically. */
function measureInner(
  img: HTMLElement | null,
  frameRect: DOMRect
): { innerHeightPct: number; innerOffsetYPct: number } {
  if (img && frameRect.height > 0) {
    const imgRect = img.getBoundingClientRect()
    if (imgRect.height > 0) {
      return {
        innerHeightPct: (imgRect.height / frameRect.height) * 100,
        innerOffsetYPct: ((imgRect.top - frameRect.top) / frameRect.height) * 100
      }
    }
  }
  return { innerHeightPct: 100, innerOffsetYPct: 0 }
}

/**
 * Captures the clicked element's visual state for the flight.
 *
 * The measured frame is the box the user actually SEES: the nearest
 * ancestor of the inner img (up to and including the clicked element) that
 * clips — real-world markup often carries the radius+overflow on an
 * intermediate frame (Velum's .arts-parallax__frame), not on the anchor.
 * Without a clipping ancestor, the visible rounding is the img's own (plain
 * grids) or the clicked element's.
 */
export function captureFlightSource(
  sourceEl: HTMLElement,
  innerHome?: HTMLElement | null
): IFlightSource {
  const img = sourceEl.querySelector('img, video') as HTMLImageElement | HTMLVideoElement | null

  let frame: HTMLElement = sourceEl
  let radius = Number.parseFloat(getComputedStyle(sourceEl).borderRadius) || 0

  // Walk start: the inner media's parent — or, when the media is absent
  // (adopted into the lightbox mid-close), its recorded home slot, which is
  // itself a clip-box candidate.
  const walkStart =
    img?.parentElement ?? (innerHome && sourceEl.contains(innerHome) ? innerHome : null)
  if (walkStart) {
    const clipBox = findClipBox(walkStart, sourceEl)
    if (clipBox) {
      frame = clipBox
      radius = Number.parseFloat(getComputedStyle(clipBox).borderRadius) || 0
    } else if (!radius && img) {
      // Nothing clips and the clicked element is square — the visible
      // rounding, if any, is the img's own.
      radius = Number.parseFloat(getComputedStyle(img).borderRadius) || 0
    }
  }

  const frameRect = frame.getBoundingClientRect()
  return {
    rect: { x: frameRect.left, y: frameRect.top, w: frameRect.width, h: frameRect.height },
    radius,
    src: mediaSrc(img),
    ...measureInner(img, frameRect)
  }
}
