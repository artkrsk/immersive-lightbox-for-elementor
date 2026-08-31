import type PhotoSwipe from '../photoswipe/photoswipe'
import { createMomentumClassifier } from './createMomentumClassifier'
import { followStrip, indexShiftFor } from './followStrip'
import { settleStrip } from './settleStrip'

/** Coasting ends when the momentum tail goes quiet for this long. */
const COAST_GAP_MS = 200
/** Tracking safety net: a no-momentum lift with idle hands settles here. */
const SAFETY_SETTLE_MS = 1200

/**
 * The scroll-phase state machine behind Photos.app-grade trackpad swipes.
 *
 * Native apps see scroll *phases*: fingers-down events, an exact finger-lift
 * moment, and a separate system-generated momentum stream. The web doesn't —
 * so this rebuilds them:
 *
 * - `tracking`: fingers on glass, the strip follows 1:1 (with mid-gesture
 *   index commits so successive swipes chain). Silence means HOLDING, not
 *   release — nothing settles while you rest your fingers.
 * - Release evidence, in order of quality: the momentum classifier's native
 *   bit or decay signature, any non-wheel input (impossible while fingers
 *   are scrolling — a quiet lift reveals itself the moment the cursor
 *   moves), or a long safety timeout.
 * - `coasting`: the settle is committed; the momentum tail is swallowed. A
 *   fresh finger gesture breaks through immediately and chains.
 */
export function createWheelPhases(pswp: PhotoSwipe): {
  /** One non-pinch wheel event, with its arrival timestamp. */
  onWheel(wheel: WheelEvent, now: number): void
  /** Any non-wheel input — proof that fingers left the glass. */
  onOtherInput(): void
  destroy(): void
} {
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

  /** Fingers on glass: follow 1:1, then commit the index if the strip fully
   *  reached a neighbor. */
  const track = (wheel: WheelEvent, dt: number): void => {
    const { mainScroll } = pswp
    const follow = followStrip({
      x: mainScroll.x,
      currX: mainScroll.getCurrSlideX(),
      slideWidth: mainScroll.slideWidth,
      deltaX: wheel.deltaX,
      velocityX,
      dt
    })
    velocityX = follow.velocityX
    mainScroll.moveTo(follow.nextX, true)

    // Read the strip's position back rather than trusting follow.nextX:
    // moveTo applies end friction when the gallery cannot loop.
    const shift = indexShiftFor(mainScroll.x, mainScroll.getCurrSlideX(), mainScroll.slideWidth)
    if (shift !== 0) {
      mainScroll.moveIndexBy(shift, true, velocityX)
    }
  }

  return {
    onWheel: (wheel, now) => {
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

      track(wheel, dt)

      // Holding still is NOT a release — no gap timer here. The safety net
      // only catches a no-momentum lift followed by fully idle hands.
      arm(SAFETY_SETTLE_MS, () => {
        settle(velocityX)
      })
    },

    onOtherInput: () => {
      if (state === 'tracking') {
        settle(velocityX)
      }
    },

    destroy: clearTimer
  }
}
