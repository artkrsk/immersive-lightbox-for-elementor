import type PhotoSwipe from '../photoswipe/photoswipe.js'

const CAN_ZOOM_CLASS = 'arts-lightbox-can-zoom'
const ZOOMED_IN_CLASS = 'arts-lightbox-zoomed-in'
const EPSILON = 0.001

/**
 * Owns the zoom cursor state. PhotoSwipe's own cursor classes require
 * `imageClickAction === 'zoom'` literally (ours is a function) and exact
 * zoom-level equality — both too fragile. We derive from live state:
 * can-zoom = the slide has meaningful zoom range; zoomed-in = ANY level
 * beyond fit. The cursor must promise what the click toggle actually does,
 * and the toggle's out-branch triggers from any level above fit — so the
 * zoom-out cursor shows for the whole zoomed-in range, not just the ceiling.
 */
export function attachZoomCursor(pswp: PhotoSwipe): void {
  const update = (): void => {
    const slide = pswp.currSlide
    if (!slide || !pswp.element) {
      return
    }
    const { fit, fill } = slide.zoomLevels
    const canZoom =
      slide.isZoomable() &&
      typeof fit === 'number' &&
      typeof fill === 'number' &&
      fill - fit > EPSILON
    const zoomedIn = typeof fit === 'number' && slide.currZoomLevel > fit + EPSILON
    pswp.element.classList.toggle(CAN_ZOOM_CLASS, canZoom)
    pswp.element.classList.toggle(ZOOMED_IN_CLASS, canZoom && zoomedIn)
  }
  pswp.on('zoomPanUpdate', update)
  pswp.on('change', update)
  pswp.on('afterInit', update)
}
