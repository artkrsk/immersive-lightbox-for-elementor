import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

/** A pause in wheel events longer than this ends the gesture. */
const GESTURE_GAP_MS = 150
/** Same velocity threshold the touch drag settle uses (px/ms). */
const MIN_NEXT_SLIDE_SPEED = 0.5

/**
 * Wheel policy for explore mode: mousemove owns panning, so a plain wheel
 * never pans. Horizontal two-finger swipes drive the main scroll
 * CONTINUOUSLY — the strip follows the gesture (and its momentum tail)
 * exactly like a touch drag, then settles with PhotoSwipe's own recipe:
 * velocity + visible-ratio decide next/prev/stay. Ctrl+wheel — the
 * trackpad pinch — stays PhotoSwipe's zoom.
 */
export function attachWheelNav(pswp: PhotoSwipe, opts: IOptions): void {
  if (!opts.explore.enabled || opts.zoom.wheelToZoom) {
    return
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return
  }

  let active = false
  let lastTime = 0
  let velocityX = 0
  let settleTimer: ReturnType<typeof setTimeout> | null = null

  const settle = (): void => {
    settleTimer = null
    if (!active) {
      return
    }
    active = false
    const { mainScroll, viewportSize } = pswp
    if (!mainScroll.isShifted()) {
      velocityX = 0
      return
    }
    // PhotoSwipe's touch-drag settle recipe, verbatim semantics.
    const ratio = (mainScroll.x - mainScroll.getCurrSlideX()) / viewportSize.x
    let indexDiff = 0
    let v = velocityX
    if ((v < -MIN_NEXT_SLIDE_SPEED && ratio < 0) || (v < 0.1 && ratio < -0.5)) {
      indexDiff = 1
      v = Math.min(v, 0)
    } else if ((v > MIN_NEXT_SLIDE_SPEED && ratio > 0) || (v > -0.1 && ratio > 0.5)) {
      indexDiff = -1
      v = Math.max(v, 0)
    }
    mainScroll.moveIndexBy(indexDiff, true, v)
    velocityX = 0
  }

  pswp.on('wheel', (e) => {
    const wheel = e.originalEvent
    if (wheel.ctrlKey) {
      return // trackpad pinch → stock zoom
    }
    e.preventDefault() // cancel PhotoSwipe's wheel pan/zoom handling

    const horizontal = Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)
    const now = performance.now()
    if (!active) {
      if (!horizontal) {
        return // vertical scroll: swallowed, mousemove owns panning
      }
      active = true
      pswp.animations.stopMainScroll()
      lastTime = now
    }

    // The strip follows the fingers 1:1 (deltaX > 0 = swipe left = forward),
    // clamped to one slide of displacement so a momentum flick can't
    // overshoot past the settle logic's ±1 range.
    const { mainScroll } = pswp
    const currX = mainScroll.getCurrSlideX()
    const nextX = Math.max(
      currX - mainScroll.slideWidth,
      Math.min(currX + mainScroll.slideWidth, mainScroll.x - wheel.deltaX)
    )
    const dt = Math.max(1, now - lastTime)
    lastTime = now
    // Light smoothing — per-event instantaneous velocity is noisy.
    velocityX = velocityX * 0.7 + ((nextX - mainScroll.x) / dt) * 0.3
    mainScroll.moveTo(nextX, true)

    if (settleTimer) {
      clearTimeout(settleTimer)
    }
    settleTimer = setTimeout(settle, GESTURE_GAP_MS)
  })

  pswp.on('destroy', () => {
    if (settleTimer) {
      clearTimeout(settleTimer)
    }
  })
}
