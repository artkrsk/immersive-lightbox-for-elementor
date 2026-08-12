import type { IMediaController, IMediaState } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { bridgeSound } from './bridgeSound'
import { slideData } from './slideData'
import { videoElementSound } from './videoElementSound'

/**
 * The UI-facing media surface: pause-everything for teardown paths, and the
 * ACTIVE slide's sound toggle resolved to its tier — adopted element,
 * cold/cloned element, or bridged embed.
 */
export function createMediaController(pswp: PhotoSwipe, state: IMediaState): IMediaController {
  const pauseAll = (): void => {
    for (const bridge of state.bridges.values()) {
      bridge.pause()
    }
    for (const holder of pswp.mainScroll.itemHolders) {
      const el = holder.slide?.content?.element
      // Adopted elements are deliberately NOT paused — they go home playing.
      if (el instanceof HTMLVideoElement) {
        el.pause()
      }
    }
  }

  const getSound: IMediaController['getSound'] = () => {
    const slide = pswp.currSlide
    if (!slide) {
      return null
    }
    const data = slideData(slide)
    if (data.type !== 'video') {
      return null
    }
    const el = data.adopted?.element ?? slide.content?.element
    if (el instanceof HTMLVideoElement) {
      return videoElementSound(el)
    }
    if (el instanceof HTMLIFrameElement) {
      return bridgeSound(el, state)
    }
    return null
  }

  return { pauseAll, getSound }
}
