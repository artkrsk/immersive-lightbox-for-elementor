import type PhotoSwipe from '../photoswipe/photoswipe.js'

const CAN_ZOOM_CLASS = 'arts-lightbox-can-zoom'
const AT_MAX_CLASS = 'arts-lightbox-at-max-zoom'
const EPSILON = 0.001

/**
 * Owns the zoom cursor state. PhotoSwipe's own cursor classes require
 * `imageClickAction === 'zoom'` literally (ours is a function) and exact
 * zoom-level equality — both too fragile. We derive from live state:
 * can-zoom = the slide has meaningful zoom range; at-max = no further
 * zoom-in possible (cursor flips to zoom-out).
 */
export function attachZoomCursor(pswp: PhotoSwipe): void {
  const update = (): void => {
    const slide = pswp.currSlide
    if (!slide || !pswp.element) {
      return
    }
    const { fit, fill, max } = slide.zoomLevels
    const canZoom =
      slide.isZoomable() &&
      typeof fit === 'number' &&
      typeof fill === 'number' &&
      fill - fit > EPSILON
    const atMax = typeof max === 'number' && slide.currZoomLevel >= max - EPSILON
    pswp.element.classList.toggle(CAN_ZOOM_CLASS, canZoom)
    pswp.element.classList.toggle(AT_MAX_CLASS, canZoom && atMax)
  }
  pswp.on('zoomPanUpdate', update)
  pswp.on('change', update)
  pswp.on('afterInit', update)
}
