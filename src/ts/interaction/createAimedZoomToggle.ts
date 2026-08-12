import { EASINGS } from '../core/easings'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { createClock } from '../transition/clock'
import { mapPointerToPan } from './mapPointerToPan'

const FIT_EPSILON = 0.001
const AIMED_ZOOM_MS = 350
const AIMED_ZOOM_EASE = EASINGS['power2.inOut']

/**
 * Click-toggle between fit and fill on our own clock, with the pan
 * continuously aimed at the live mouse each frame — landing exactly where
 * the pointer is, so the following mousemove is seamless. (At fit the pan
 * range is degenerate, so the same mapping centers automatically.)
 */
export function createAimedZoomToggle(
  pswp: PhotoSwipe,
  pointer01: { x: number; y: number },
  onStart: () => void
): { toggle(): void; cancel(): void; active(): boolean } {
  let clock: { cancel(): void } | null = null

  const toggle = (): void => {
    const slide = pswp.currSlide
    if (!slide || clock) {
      return
    }
    const { fit, fill } = slide.zoomLevels
    if (typeof fit !== 'number' || typeof fill !== 'number' || fill - fit < FIT_EPSILON) {
      return
    }
    const from = slide.currZoomLevel
    const dest = from > fit + FIT_EPSILON ? fit : fill
    onStart()
    // Keep the session zoom mode in sync (zoomMode listens to this event).
    pswp.dispatch('beforeZoomTo', {
      destZoomLevel: dest,
      centerPoint: undefined,
      transitionDuration: AIMED_ZOOM_MS
    })
    clock = createClock(
      AIMED_ZOOM_MS,
      AIMED_ZOOM_EASE,
      (eased) => {
        const s = pswp.currSlide
        if (!s) {
          return
        }
        s.setZoomLevel(from + (dest - from) * eased)
        const aimed = mapPointerToPan(pointer01, s.bounds)
        s.pan.x = aimed.x
        s.pan.y = aimed.y
        s.applyCurrentZoomPan()
      },
      () => {
        clock = null
      }
    )
  }

  return {
    toggle,
    cancel: () => {
      clock?.cancel()
      clock = null
    },
    active: () => clock !== null
  }
}
