import { FRAME_60, MAX_STEP_DT } from '../constants'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { aimNeighbors, isAboveFit } from './aimAtPointer'
import { glideStep } from './glideStep'
import { mapPointerToPan } from './mapPointerToPan'

/**
 * The rAF lerp that carries the current slide toward the pointer-mapped
 * target. Owns the loop and the target; the pointer itself and whatever
 * blocks the glide (a drag in progress, the aimed zoom's own clock) stay
 * with the caller.
 */
export function createExploreGlide(
  pswp: PhotoSwipe,
  pointer01: { x: number; y: number },
  smoothing: number,
  deps: {
    /** Another writer owns the pan right now. */
    isBlocked(): boolean
    /** The user just took the aim from the opening seed. */
    onTakeover(): void
  }
): {
  /** The pointer moved — glide the current slide toward it. */
  aim(): void
  /** Drop the target; the aim passed to someone else. */
  release(): void
  destroy(): void
} {
  let target: { x: number; y: number } | null = null
  let rafId = 0
  /** rAF timestamp of the previous step; null while the loop is stopped. */
  let lastStepAt: number | null = null

  const step = (now: number): void => {
    rafId = 0
    const dt = lastStepAt === null ? FRAME_60 : Math.min(Math.max(now - lastStepAt, 0), MAX_STEP_DT)
    lastStepAt = now
    const slide = pswp.currSlide
    if (!target || !slide || deps.isBlocked()) {
      lastStepAt = null
      return
    }
    const next = glideStep(slide.pan, target, smoothing, dt)
    if (!next) {
      lastStepAt = null
      return
    }
    slide.panTo(next.x, next.y)
    rafId = requestAnimationFrame(step)
  }

  return {
    aim: () => {
      const slide = pswp.currSlide
      if (!slide || deps.isBlocked()) {
        return
      }
      if (!isAboveFit(slide)) {
        target = null
        return
      }
      deps.onTakeover()
      target = mapPointerToPan(pointer01, slide.bounds)
      if (!rafId) {
        rafId = requestAnimationFrame(step)
      }
      aimNeighbors(pswp, pointer01)
    },
    release: () => {
      target = null
    },
    destroy: () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      lastStepAt = null
    }
  }
}
