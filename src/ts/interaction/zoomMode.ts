import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const EPSILON = 0.001

/**
 * Zoom as a session MODE, not a per-slide state: zooming out to fit means
 * the next slides also arrive at fit; back to fill restores the mode.
 *
 * Threshold-based on the LIVE zoom level (zoomPanUpdate), so every input —
 * click toggle, trackpad pinch, wheel — updates the mode the moment the
 * level settles at fit or fill. On a mode change, already-appended
 * neighbor slides sync immediately while offscreen; a slide arriving
 * mismatched mid-swipe would otherwise visibly snap.
 */
export function attachZoomMode(pswp: PhotoSwipe, opts: IOptions): void {
  let mode: 'fit' | 'fill' = opts.zoom.initialLevel

  const syncSlide = (slide: NonNullable<PhotoSwipe['currSlide']>): void => {
    const target = slide.zoomLevels[mode]
    if (typeof target !== 'number' || Math.abs(slide.currZoomLevel - target) < EPSILON) {
      return
    }
    slide.setZoomLevel(target)
    slide.pan.x = slide.bounds.center.x
    slide.pan.y = slide.bounds.center.y
    slide.applyCurrentZoomPan()
  }

  const syncNeighbors = (): void => {
    for (const holder of pswp.mainScroll.itemHolders) {
      if (holder.slide && holder.slide !== pswp.currSlide) {
        syncSlide(holder.slide)
      }
    }
  }

  const setMode = (next: 'fit' | 'fill'): void => {
    if (next === mode) {
      return
    }
    mode = next
    // Future slides parse their levels from the shared options object.
    pswp.options.initialZoomLevel = mode
    pswp.options.secondaryZoomLevel = mode === 'fill' ? 'fit' : 'fill'
    // Already-appended neighbors sync now, offscreen — never mid-swipe.
    syncNeighbors()
  }

  pswp.on('zoomPanUpdate', (e) => {
    const slide = e.slide
    const { fit, fill } = slide.zoomLevels
    if (typeof fit !== 'number' || typeof fill !== 'number' || fill - fit < EPSILON) {
      return
    }
    if (slide.currZoomLevel <= fit + EPSILON) {
      setMode('fit')
    } else if (slide.currZoomLevel >= fill - EPSILON) {
      setMode('fill')
    }
  })

  // Fallback for slides that appended before a mode change reached them.
  pswp.on('change', () => {
    const slide = pswp.currSlide
    if (slide) {
      syncSlide(slide)
    }
  })
}
