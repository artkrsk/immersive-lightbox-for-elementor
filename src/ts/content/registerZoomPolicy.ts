import type { ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import type { TZoomMode } from '../types/TZoomMode'
import { slideData } from './slideData'

/**
 * Which slides may zoom at all. Video/html slides are FIT-only: the global
 * fill-first zoom model would open them cropped — clipping a video's
 * controls — with no way to pan back out. With zoom mode 'off' that goes
 * for every slide. Either way every zoom level collapses onto fit and the
 * slide is not zoomable, which is the one verdict the fork consults before
 * wheel, ctrl+wheel, pinch, double-tap and the click toggle — and the one
 * our cursor reads, so the affordance disappears with the ability.
 */
export function registerZoomPolicy(pswp: PhotoSwipe, mode: TZoomMode): void {
  const fitOnly = (type: ISlideData['type']): boolean =>
    mode === 'off' || type === 'video' || type === 'html'

  pswp.addFilter('isContentZoomable', (zoomable, content) =>
    fitOnly(slideData(content).type) ? false : zoomable
  )

  pswp.on('zoomLevelsUpdate', (e) => {
    if (fitOnly((e.slideData as ISlideData).type)) {
      e.zoomLevels.initial = e.zoomLevels.fit
      e.zoomLevels.secondary = e.zoomLevels.fit
      e.zoomLevels.max = e.zoomLevels.fit
    }
  })
}
