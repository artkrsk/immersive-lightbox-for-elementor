import type PhotoSwipe from '../photoswipe/photoswipe'
import { mapPointerToPan } from './mapPointerToPan'

/** At or below fit the pan range is degenerate; this absorbs float drift. */
const FIT_EPSILON = 0.001

type TSlide = NonNullable<PhotoSwipe['currSlide']>

/** Only zoomed-in slides can pan — below fit there is nothing to aim. */
export function isAboveFit(slide: TSlide): boolean {
  return slide.currZoomLevel > slide.zoomLevels.fit + FIT_EPSILON
}

/** Instantly aim a slide's pan at the pointer (no glide — for slides nobody
 *  is watching yet). No-op below fit, where pan is degenerate. */
export function aimSlideAtPointer(slide: TSlide, pointer01: { x: number; y: number }): void {
  if (!isAboveFit(slide)) {
    return
  }
  const aimed = mapPointerToPan(pointer01, slide.bounds)
  slide.pan.x = aimed.x
  slide.pan.y = aimed.y
  slide.applyCurrentZoomPan()
}

/** Neighbors stay pre-aimed at the pointer, so a swipe lands on a slide that
 *  already agrees with the mouse — no first-mousemove snap. */
export function aimNeighbors(pswp: PhotoSwipe, pointer01: { x: number; y: number }): void {
  for (const holder of pswp.mainScroll.itemHolders) {
    if (holder.slide && holder.slide !== pswp.currSlide) {
      aimSlideAtPointer(holder.slide, pointer01)
    }
  }
}
