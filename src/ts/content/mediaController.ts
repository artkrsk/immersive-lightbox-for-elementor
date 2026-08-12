import type { IMediaController, IMediaState } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { audioFocus } from '../video/audioFocus'
import { slideData } from './slideData'

/**
 * The UI-facing media surface: pause-everything for teardown paths, and the
 * ACTIVE slide's sound toggle across all tiers (adopted element, cold/cloned
 * element, or bridged embed). Unmuting claims the audio focus.
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
      return {
        muted: el.muted,
        setMuted: (muted) => {
          el.muted = muted
          if (!muted) {
            audioFocus.claim(el, () => {
              el.muted = true
            })
            void el.play().catch(() => {})
          }
        }
      }
    }
    if (el instanceof HTMLIFrameElement) {
      const bridge = state.bridges.get(el)
      if (!bridge) {
        return null
      }
      return {
        muted: state.bridgeMuted.get(el) ?? true,
        setMuted: (muted) => {
          bridge.setMuted(muted)
          state.bridgeMuted.set(el, muted)
          if (!muted) {
            bridge.play()
            audioFocus.claim(el, () => {
              bridge.setMuted(true)
              state.bridgeMuted.set(el, true)
            })
          }
        }
      }
    }
    return null
  }

  return { pauseAll, getSound }
}
