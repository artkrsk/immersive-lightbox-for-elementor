import type { IFlightSource } from '../interfaces'

const CLIPS = /hidden|clip|scroll|auto/

/**
 * Captures the clicked element's visual state for the flight.
 *
 * The measured frame is the box the user actually SEES: the nearest
 * ancestor of the inner img (up to and including the clicked element) that
 * clips — real-world markup often carries the radius+overflow on an
 * intermediate frame (Velum's .arts-parallax__frame), not on the anchor.
 * Without a clipping ancestor, the visible rounding is the img's own (plain
 * grids) or the clicked element's.
 *
 * Parallax is measured geometrically — inner img rect vs frame rect — so
 * any mechanism (transform, translate/scale properties, inline styles) is
 * captured identically.
 */
export function captureFlightSource(sourceEl: HTMLElement): IFlightSource {
  const img = sourceEl.querySelector('img, video') as HTMLImageElement | HTMLVideoElement | null

  let frame: HTMLElement = sourceEl
  let radius = Number.parseFloat(getComputedStyle(sourceEl).borderRadius) || 0

  if (img) {
    let clipBox: HTMLElement | null = null
    let el: HTMLElement | null = img.parentElement
    while (el) {
      if (CLIPS.test(getComputedStyle(el).overflow)) {
        clipBox = el
        break
      }
      if (el === sourceEl) {
        break
      }
      el = el.parentElement
    }
    if (clipBox) {
      frame = clipBox
      radius = Number.parseFloat(getComputedStyle(clipBox).borderRadius) || 0
    } else if (!radius) {
      // Nothing clips and the clicked element is square — the visible
      // rounding, if any, is the img's own.
      radius = Number.parseFloat(getComputedStyle(img).borderRadius) || 0
    }
  }

  const frameRect = frame.getBoundingClientRect()
  // An img-mode flight needs an IMAGE source: the img's own src, or a
  // video's poster (a video file URL painted into an <img> shows nothing).
  const src =
    img instanceof HTMLVideoElement
      ? img.poster || img.getAttribute('poster') || ''
      : img?.currentSrc || img?.getAttribute('src') || ''
  const source: IFlightSource = {
    rect: { x: frameRect.left, y: frameRect.top, w: frameRect.width, h: frameRect.height },
    radius,
    innerHeightPct: 100,
    innerOffsetYPct: 0,
    src
  }
  if (img && frameRect.height > 0) {
    const imgRect = img.getBoundingClientRect()
    if (imgRect.height > 0) {
      source.innerHeightPct = (imgRect.height / frameRect.height) * 100
      source.innerOffsetYPct = ((imgRect.top - frameRect.top) / frameRect.height) * 100
    }
  }
  return source
}
