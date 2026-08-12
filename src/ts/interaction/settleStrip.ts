import type PhotoSwipe from '../photoswipe/photoswipe'

/** Same velocity threshold the touch drag settle uses (px/ms). */
const MIN_NEXT_SLIDE_SPEED = 0.5

/**
 * PhotoSwipe's touch-drag settle recipe with the given release velocity:
 * fast enough toward a neighbor commits it, a slow release past half a
 * viewport commits too, anything else snaps back. False when the strip
 * wasn't shifted at all (nothing to settle).
 */
export function settleStrip(pswp: PhotoSwipe, releaseVelocity: number): boolean {
  const { mainScroll, viewportSize } = pswp
  if (!mainScroll.isShifted()) {
    return false
  }
  const ratio = (mainScroll.x - mainScroll.getCurrSlideX()) / viewportSize.x
  let indexDiff = 0
  let v = releaseVelocity
  if ((v < -MIN_NEXT_SLIDE_SPEED && ratio < 0) || (v < 0.1 && ratio < -0.5)) {
    indexDiff = 1
    v = Math.min(v, 0)
  } else if ((v > MIN_NEXT_SLIDE_SPEED && ratio > 0) || (v > -0.1 && ratio > 0.5)) {
    indexDiff = -1
    v = Math.max(v, 0)
  }
  mainScroll.moveIndexBy(indexDiff, true, v)
  return true
}
