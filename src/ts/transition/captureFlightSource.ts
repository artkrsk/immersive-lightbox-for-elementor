import type { IFlightSource } from '../interfaces'
import { isTagElement } from '../utils/isTagElement'

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
  if (isTagElement(img, 'video')) {
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
 * intermediate frame (a parallax wrapper's `.arts-parallax__frame`, say),
 * not on the anchor.
 * Without a clipping ancestor, the visible rounding is the img's own (plain
 * grids) or the clicked element's.
 */
export function captureFlightSource(sourceEl: HTMLElement): IFlightSource {
  const img = sourceEl.querySelector('img, video') as HTMLImageElement | HTMLVideoElement | null

  let frame: HTMLElement = sourceEl
  let radius = Number.parseFloat(getComputedStyle(sourceEl).borderRadius) || 0

  const walkStart = img?.parentElement ?? null
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

  // An inline frame cannot clip, and its rect is a text LINE BOX — plain WP
  // content (<p><a><img>) measures the anchor as a ~20px sliver at the
  // baseline with the image floating far above it, so the flight would
  // launch from a collapsed strip. The box the user actually sees is the
  // media's own.
  if (img && getComputedStyle(frame).display === 'inline') {
    frame = img
  }

  const frameRect = frame.getBoundingClientRect()
  return {
    rect: { x: frameRect.left, y: frameRect.top, w: frameRect.width, h: frameRect.height },
    radius,
    src: mediaSrc(img),
    ...measureInner(img, frameRect)
  }
}
