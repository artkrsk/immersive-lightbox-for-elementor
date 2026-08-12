import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { slideData } from './slideData'

/**
 * Slides whose dims were guessed from thumb attributes upgrade to the real
 * naturals once the full image is in — right aspect was never the problem,
 * the SCALE was (PhotoSwipe caps zoom at what it believes is natural size).
 */
export function registerDimsUpgrade(pswp: PhotoSwipe): void {
  pswp.on('loadComplete', (e) => {
    const data = slideData(e.content)
    const slide = e.slide
    const el = e.content.element
    if (!slide || !data.dimsGuessed || !(el instanceof HTMLImageElement) || !el.naturalWidth) {
      return
    }
    if (slide.width === el.naturalWidth && slide.height === el.naturalHeight) {
      return
    }
    slide.width = el.naturalWidth
    slide.height = el.naturalHeight
    data.width = el.naturalWidth
    data.height = el.naturalHeight
    data.dimsGuessed = false
    // The resize() recipe: re-derive zoom levels, re-place, re-paint.
    slide.calculateSize()
    slide.zoomAndPanToInitial()
    slide.applyCurrentZoomPan()
    slide.updateContentSize(true)
  })
}
