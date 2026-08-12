import type { ILightboxApi, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

/** A pause in wheel events longer than this starts a new gesture. */
const GESTURE_GAP_MS = 150
/** Accumulated horizontal delta that triggers a slide change. */
const NAV_THRESHOLD = 80

/**
 * Wheel policy for explore mode: mousemove owns panning, so a plain wheel
 * must not pan (it fought the explore lerp — two writers). Instead,
 * horizontal two-finger swipes navigate slides (one per gesture, momentum
 * tails swallowed), vertical wheel does nothing, and ctrl+wheel — the
 * trackpad pinch — stays PhotoSwipe's zoom. Uses PhotoSwipe's cancellable
 * 'wheel' event, so the page-scroll preventDefault is already handled.
 */
export function attachWheelNav(pswp: PhotoSwipe, opts: IOptions, api: ILightboxApi): void {
  if (!opts.explore.enabled || opts.zoom.wheelToZoom) {
    return
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return
  }

  let accX = 0
  let lastTime = 0
  let consumed = false

  pswp.on('wheel', (e) => {
    const wheel = e.originalEvent
    if (wheel.ctrlKey) {
      return // trackpad pinch → stock zoom
    }
    e.preventDefault() // cancel PhotoSwipe's wheel pan/zoom handling

    const now = performance.now()
    if (now - lastTime > GESTURE_GAP_MS) {
      accX = 0
      consumed = false
    }
    lastTime = now
    if (consumed || Math.abs(wheel.deltaX) <= Math.abs(wheel.deltaY)) {
      return
    }
    accX += wheel.deltaX
    if (Math.abs(accX) > NAV_THRESHOLD) {
      consumed = true
      if (accX > 0) {
        api.next()
      } else {
        api.prev()
      }
    }
  })
}
