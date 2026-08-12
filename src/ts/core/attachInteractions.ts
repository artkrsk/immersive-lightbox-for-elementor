import { attachExploreMode } from '../interaction/exploreMode'
import { attachWheelNav } from '../interaction/wheelNav'
import { attachZoomCursor } from '../interaction/zoomCursor'
import { attachZoomMode } from '../interaction/zoomMode'
import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * The pointer-driven enhancements, in the one order that works — this
 * sequence IS the contract, not an implementation detail. `point` is the
 * opening click, which seeds the initial pan.
 */
export function attachInteractions(
  pswp: PhotoSwipe,
  opts: IOptions,
  point?: { x: number; y: number }
): void {
  attachZoomCursor(pswp)
  // Before explore: its change-listener centers arriving slides, and
  // explore's pointer-aim (registered after) must win over that.
  attachZoomMode(pswp, opts)
  const explore = attachExploreMode(pswp, opts, point)
  // With explore active, the click zoom toggle runs aimed at the live
  // mouse (one continuous writer) instead of PhotoSwipe's tap-point zoom.
  if (explore && opts.zoom.imageClickAction === 'zoom') {
    pswp.options.imageClickAction = () => {
      explore.toggleZoomAimed()
    }
  }
  attachWheelNav(pswp, opts)
}
