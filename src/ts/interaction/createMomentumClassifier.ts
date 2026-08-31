/** Fallback classifier: this many consecutive decaying deltas = momentum. */
const DECAY_RUN = 3
/** Fallback classifier: momentum events are frame-locked, gaps stay short. */
const DECAY_MAX_GAP_MS = 40

/**
 * Tells finger-driven wheel events from the post-lift momentum stream.
 *
 * Ground truth when the UA provides it: `WheelEvent.momentum` (Chrome
 * 151+) — inertia only exists after a lift. Elsewhere, the decay
 * signature: same-sign, non-increasing deltas at frame-locked gaps,
 * requiring a run — a user slowing down looks similar briefly. The
 * velocity at the decay-run start is kept as the release velocity (the
 * fallback consumed the first momentum events into the strip).
 */
export function createMomentumClassifier(): {
  classify(wheel: WheelEvent, dt: number, currentVelocity: number): 'native' | 'decay' | false
  /** Velocity captured where the decay run began. */
  peakVelocity(): number
  reset(): void
} {
  let decays = 0
  let prevAbsDelta = 0
  let prevSign = 0
  let peak = 0

  return {
    classify: (wheel, dt, currentVelocity) => {
      const native = (wheel as WheelEvent & { momentum?: boolean }).momentum
      if (typeof native === 'boolean') {
        return native ? 'native' : false
      }
      const absDelta = Math.abs(wheel.deltaX)
      const sign = Math.sign(wheel.deltaX)
      if (sign !== 0 && sign === prevSign && absDelta <= prevAbsDelta && dt <= DECAY_MAX_GAP_MS) {
        decays++
      } else {
        decays = 0
        peak = currentVelocity
      }
      prevAbsDelta = absDelta
      prevSign = sign
      return decays >= DECAY_RUN ? 'decay' : false
    },
    peakVelocity: () => peak,
    reset: () => {
      decays = 0
      prevAbsDelta = 0
      prevSign = 0
      peak = 0
    }
  }
}
