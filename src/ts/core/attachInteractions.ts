import { attachDragCursor } from '../interaction/dragCursor'
import { attachExploreMode } from '../interaction/exploreMode'
import { attachSlideRegion } from '../interaction/slideRegion'
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
  // Order-free: they only mark pointer state the cursor rules read — where
  // the pointer is (image or the space beside it) and whether it is pressed.
  attachSlideRegion(pswp)
  attachDragCursor(pswp, opts)
  // With zoom off nothing is ever zoomed, so there is no session mode to
  // keep and nothing for the mouse to explore. The cursor still attaches:
  // it reads the (now always-false) zoomability and paints the drag hint.
  if (opts.zoom.mode !== 'off') {
    // Before explore: its change-listener centers arriving slides, and
    // explore's pointer-aim (registered after) must win over that.
    attachZoomMode(pswp, opts)
    const explore = attachExploreMode(pswp, opts, point)
    // With explore active, the click zoom toggle runs aimed at the live
    // mouse (one continuous writer) instead of PhotoSwipe's tap-point zoom.
    if (explore) {
      pswp.options.imageClickAction = () => {
        explore.toggleZoomAimed()
      }
    }
  }
  attachWheelNav(pswp, opts)
}
