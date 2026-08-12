import type PhotoSwipe from '../photoswipe/photoswipe.js'

const AT_MAX_CLASS = 'arts-lightbox-at-max-zoom'
const EPSILON = 0.001

/**
 * Reflects "no further zoom-in possible" as a root class so the cursor can
 * say zoom-out instead of zoom-in (PhotoSwipe's own cursor logic only knows
 * zoom-in). Relevant with the fill-as-ceiling model where slides OPEN at max.
 */
export function attachZoomCursor(pswp: PhotoSwipe): void {
  const update = (): void => {
    const slide = pswp.currSlide
    if (!slide || !pswp.element) {
      return
    }
    const atMax = slide.currZoomLevel >= slide.zoomLevels.max - EPSILON
    pswp.element.classList.toggle(AT_MAX_CLASS, atMax)
  }
  pswp.on('zoomPanUpdate', update)
  pswp.on('change', update)
  pswp.on('afterInit', update)
}
