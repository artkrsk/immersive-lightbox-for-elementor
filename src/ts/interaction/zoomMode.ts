import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

const EPSILON = 0.001

/**
 * Zoom as a session MODE, not a per-slide state: zooming out to fit means
 * the next slides also arrive at fit; toggling back to fill restores the
 * mode. The user's last explicit choice wins until they change it again.
 */
export function attachZoomMode(pswp: PhotoSwipe, opts: IOptions): void {
  let mode: 'fit' | 'fill' = opts.zoom.initialLevel

  // A zoom that lands exactly on fit or fill is an explicit mode choice
  // (click toggles, double-tap); arbitrary wheel levels leave the mode as is.
  pswp.on('beforeZoomTo', (e) => {
    const slide = pswp.currSlide
    if (!slide) {
      return
    }
    const { fit, fill } = slide.zoomLevels
    if (typeof fit !== 'number' || typeof fill !== 'number') {
      return
    }
    const dest = e.destZoomLevel
    if (Math.abs(dest - fit) < EPSILON && fit < fill - EPSILON) {
      mode = 'fit'
    } else if (Math.abs(dest - fill) < EPSILON) {
      mode = 'fill'
    } else {
      return
    }
    // Future slides parse their levels from the shared options object.
    pswp.options.initialZoomLevel = mode
    pswp.options.secondaryZoomLevel = mode === 'fill' ? 'fit' : 'fill'
  })

  // Slides created before the mode changed still carry their old initial —
  // snap the arriving slide to the mode (instant, mid slide-change).
  pswp.on('change', () => {
    const slide = pswp.currSlide
    if (!slide) {
      return
    }
    const target = slide.zoomLevels[mode]
    if (typeof target !== 'number' || Math.abs(slide.currZoomLevel - target) < EPSILON) {
      return
    }
    slide.setZoomLevel(target)
    slide.pan.x = slide.bounds.center.x
    slide.pan.y = slide.bounds.center.y
    slide.applyCurrentZoomPan()
  })
}
