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
  // The session mode is the fill-ceiling model's companion. Under the
  // classic model (initialLevel 'fit' → stock zoom levels, secondary ~3x
  // fit) the threshold would fire on any deep zoom and rewrite the live
  // options, collapsing the stock range to the fill ceiling.
  if (opts.zoom.initialLevel !== 'fill') {
    return
  }
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
    // The CURRENT slide's zoomLevels are a cache of the pre-flip options —
    // the fork's touch pinch-end (correctZoomPan) springs back to that
    // cached `initial`, which undoes every pinch-out on release. Re-derive
    // now so the fork's own correction math agrees with the mode.
    // (Neighbors self-heal: deactivate/resize recalculate on the fork's
    // own paths.)
    const current = pswp.currSlide
    if (current) {
      current.calculateSize()
      // A slide's FIRST zoom interaction renders on the implicit resolution
      // (currentResolution 0 falls back to zoomLevels.initial in the fork's
      // transform math — and deactivate resets it, so every visit starts
      // there). The recalc above just changed `initial`, which would swap
      // the render basis under a still-fill-sized element: one oversized,
      // out-of-bounds paint until the gesture-end correction resizes it.
      // Pinning the resolution to the live level makes the basis explicit
      // and resizes the element NOW, in the same frame — visually seamless.
      if (!current.currentResolution) {
        current._setResolution(current.currZoomLevel)
      }
    }
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
