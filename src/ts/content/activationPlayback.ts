import type { IMediaState } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { isTagElement } from '../utils/isTagElement'
import { slideData } from './slideData'

/**
 * Playback follows the ACTIVE slide, never preloading: arriving plays,
 * leaving pauses.
 *
 * A slide arrives unmuted — a video opened from a link is one the viewer
 * asked to watch. The opening click is the gesture that lets the first one
 * sound; later arrivals may be refused, so a rejected play retries muted.
 * Motion beats a slide sitting dead on its poster, and `audioFocus` still
 * guarantees at most one of them is ever audible.
 */
export function registerActivationPlayback(pswp: PhotoSwipe, state: IMediaState): void {
  pswp.on('contentActivate', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video' || !state.slideAutoplay(data)) {
      return
    }
    const el = e.content.element
    if (isTagElement(el, 'video')) {
      void el.play().catch(() => {
        el.muted = true
        void el.play().catch(() => {})
      })
    } else if (isTagElement(el, 'iframe')) {
      state.bridges.get(el)?.play()
    }
  })

  pswp.on('contentDeactivate', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video') {
      return
    }
    const el = e.content.element
    if (isTagElement(el, 'video')) {
      el.pause()
    } else if (isTagElement(el, 'iframe')) {
      state.bridges.get(el)?.pause()
    }
  })
}
