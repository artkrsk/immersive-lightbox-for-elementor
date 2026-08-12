import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { createMomentumClassifier } from './createMomentumClassifier'
import { settleStrip } from './settleStrip'

/** Coasting ends when the momentum tail goes quiet for this long. */
const COAST_GAP_MS = 200
/** Tracking safety net: a no-momentum lift with idle hands settles here. */
const SAFETY_SETTLE_MS = 1200

/**
 * Photos.app-grade trackpad swipes, reconstructed from wheel events.
 *
 * Native apps see scroll *phases*: fingers-down events, an exact
 * finger-lift moment, and a separate system-generated momentum stream.
 * The web doesn't — so this state machine rebuilds them:
 *
 * - `tracking`: fingers on glass, the strip follows 1:1 (with mid-gesture
 *   index commits so successive swipes chain). Silence means HOLDING, not
 *   release — nothing settles while you rest your fingers.
 * - Release evidence, in order of quality: the momentum classifier's
 *   native bit or decay signature, a `mousemove` (impossible while
 *   fingers are scrolling — a quiet lift reveals itself the moment the
 *   cursor moves), or a long safety timeout.
 * - `coasting`: the settle is committed; the momentum tail is swallowed.
 *   A fresh finger gesture breaks through immediately and chains.
 *
 * Vertical wheel stays inert (mousemove owns panning); ctrl+wheel — the
 * trackpad pinch — remains PhotoSwipe's zoom.
 */
export function attachWheelNav(pswp: PhotoSwipe, opts: IOptions): void {
  if (!opts.explore.enabled || opts.zoom.wheelToZoom) {
    return
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return
  }

  type TState = 'idle' | 'tracking' | 'coasting'
  let state: TState = 'idle'
  let lastTime = 0
  let velocityX = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const classifier = createMomentumClassifier()

  const clearTimer = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  const arm = (ms: number, fn: () => void): void => {
    clearTimer()
    timer = setTimeout(fn, ms)
  }

  const toIdle = (): void => {
    clearTimer()
    state = 'idle'
    velocityX = 0
    classifier.reset()
  }

  const settle = (releaseVelocity: number): void => {
    clearTimer()
    if (!settleStrip(pswp, releaseVelocity)) {
      state = 'idle'
      return
    }
    state = 'coasting'
    arm(COAST_GAP_MS, toIdle)
  }

  /**
   * Fingers left the glass without momentum — any non-wheel input proves
   * it: the cursor can't move and keys/pointers can't act while two
   * fingers are scrolling. With these, the safety timeout only covers
   * "quiet lift, then hands fully off everything".
   */
  const onOtherInput = (): void => {
    if (state === 'tracking') {
      settle(velocityX)
    }
  }

  pswp.on('wheel', (e) => {
    const wheel = e.originalEvent
    if (wheel.ctrlKey) {
      return // trackpad pinch → stock zoom
    }
    e.preventDefault() // wheel never pans; mousemove owns panning

    const now = performance.now()
    const dt = Math.max(1, now - lastTime)
    lastTime = now
    const momentum = classifier.classify(wheel, dt, velocityX)
    const horizontal = Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)

    if (state === 'coasting') {
      if (momentum) {
        arm(COAST_GAP_MS, toIdle)
        return // swallow the tail — the settle is already committed
      }
      toIdle() // fresh fingers broke through — fall into idle handling
    }

    if (state === 'idle') {
      if (momentum || !horizontal) {
        return // stray tails and vertical scroll own nothing
      }
      // The classifier's decay window deliberately carries over — idle
      // events already fed it, so an early lift still classifies. Its peak
      // is zero here by construction (velocity only accrues in tracking).
      state = 'tracking'
      velocityX = 0
      pswp.animations.stopMainScroll()
    }

    // state === 'tracking'
    if (momentum) {
      // Fingers are off the glass — this is the release moment. The
      // fallback classifier consumed the first decaying events into the
      // strip, so it settles with the velocity captured at the peak.
      settle(momentum === 'native' ? velocityX : classifier.peakVelocity())
      return
    }

    // Fingers on glass: the strip follows 1:1, clamped to one slide of
    // displacement around the CURRENT index...
    const { mainScroll } = pswp
    const currX = mainScroll.getCurrSlideX()
    const nextX = Math.max(
      currX - mainScroll.slideWidth,
      Math.min(currX + mainScroll.slideWidth, mainScroll.x - wheel.deltaX)
    )
    velocityX = velocityX * 0.7 + ((nextX - mainScroll.x) / dt) * 0.3
    mainScroll.moveTo(nextX, true)

    // ...and the index commits mid-gesture the moment the strip fully
    // reaches a neighbor, rebasing the clamp so swipes chain fluidly.
    const shift = mainScroll.x - mainScroll.getCurrSlideX()
    if (Math.abs(shift) >= mainScroll.slideWidth - 1) {
      mainScroll.moveIndexBy(shift < 0 ? 1 : -1, true, velocityX)
    }

    // Holding still is NOT a release — no gap timer here. The safety net
    // only catches a no-momentum lift followed by fully idle hands.
    arm(SAFETY_SETTLE_MS, () => {
      settle(velocityX)
    })
  })

  pswp.on('bindEvents', () => {
    pswp.element?.addEventListener('mousemove', onOtherInput, { passive: true })
    document.addEventListener('keydown', onOtherInput, { capture: true, passive: true })
    document.addEventListener('pointerdown', onOtherInput, { capture: true, passive: true })
  })
  pswp.on('destroy', () => {
    clearTimer()
    document.removeEventListener('keydown', onOtherInput, { capture: true })
    document.removeEventListener('pointerdown', onOtherInput, { capture: true })
  })
}
