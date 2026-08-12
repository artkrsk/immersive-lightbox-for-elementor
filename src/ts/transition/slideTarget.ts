import type { IFlightTarget } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { computeSlideRect } from './computeSlideRect'

/**
 * The slide's designed corner radius — the flight must land exactly on it
 * or every hand-off pops. Read from the themable custom property that also
 * paints .pswp__img.
 */
function readSlideRadius(pswpRoot: HTMLElement | undefined): number {
  if (!pswpRoot) {
    return 0
  }
  return (
    Number.parseFloat(
      getComputedStyle(pswpRoot).getPropertyValue('--arts-lightbox-slide-radius')
    ) || 0
  )
}

/** The current slide's rect, or null when PhotoSwipe has nothing placed. */
export function currentSlideTarget(pswp: PhotoSwipe): IFlightTarget | null {
  const slide = pswp.currSlide
  if (!slide?.width || !slide.height) {
    return null
  }
  return { rect: computeSlideRect(slide), radius: readSlideRadius(pswp.element) }
}
