import type { ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { slideData } from './slideData'

/**
 * Video/html slides are FIT-only. The global fill-first zoom model would open
 * them cropped — clipping a video's controls — with no way to pan back out,
 * so every zoom level collapses onto fit and the slides are not zoomable at
 * all, keeping the click and pinch paths from fighting the clamp.
 */
export function registerZoomPolicy(pswp: PhotoSwipe): void {
  pswp.addFilter('isContentZoomable', (zoomable, content) => {
    const type = slideData(content).type
    return type === 'video' || type === 'html' ? false : zoomable
  })

  pswp.on('zoomLevelsUpdate', (e) => {
    const type = (e.slideData as ISlideData).type
    if (type === 'video' || type === 'html') {
      e.zoomLevels.initial = e.zoomLevels.fit
      e.zoomLevels.secondary = e.zoomLevels.fit
      e.zoomLevels.max = e.zoomLevels.fit
    }
  })
}
