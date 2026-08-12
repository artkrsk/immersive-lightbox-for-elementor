import type { IMediaState } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { slideData } from './slideData'

/**
 * Playback follows the ACTIVE slide, never preloading: arriving plays
 * (gated by the autoplay policy), leaving pauses. Adopted page videos
 * resume/pause the live element itself.
 */
export function registerActivationPlayback(pswp: PhotoSwipe, state: IMediaState): void {
  pswp.on('contentActivate', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video' || !state.slideAutoplay(data)) {
      return
    }
    if (data.adopted) {
      // Ambient continuation: resume if a deactivate paused it.
      void data.adopted.element.play().catch(() => {})
      return
    }
    const el = e.content.element
    if (el instanceof HTMLVideoElement) {
      void el.play().catch(() => {})
    } else if (el instanceof HTMLIFrameElement) {
      state.bridges.get(el)?.play()
    }
  })

  pswp.on('contentDeactivate', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video') {
      return
    }
    if (data.adopted) {
      data.adopted.element.pause()
      return
    }
    const el = e.content.element
    if (el instanceof HTMLVideoElement) {
      el.pause()
    } else if (el instanceof HTMLIFrameElement) {
      state.bridges.get(el)?.pause()
    }
  })
}
