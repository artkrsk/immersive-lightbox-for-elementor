import type PhotoSwipe from '../photoswipe/photoswipe'
import { fitWithin } from './fitWithin'
import { slideData } from './slideData'

const DEFAULT_ASPECT = 16 / 9

/**
 * Video boxes aspect-fit the pan area themselves — PhotoSwipe only sizes
 * images, so without this a video slide would be handed the raw pan box.
 */
export function registerAspectFit(pswp: PhotoSwipe): void {
  pswp.on('contentResize', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video' || !e.content.element) {
      return
    }
    e.preventDefault()
    const aspect = data.width && data.height ? data.width / data.height : DEFAULT_ASPECT
    const fit = fitWithin({ x: e.width, y: e.height }, aspect)
    const el = e.content.element
    el.style.width = `${fit.w}px`
    el.style.height = `${fit.h}px`
  })
}
