import { lerpFactor } from '../utils'

/** Below this (px) the motion is imperceptible — idle rather than spin the
 *  rAF loop on sub-pixel corrections. */
const IDLE_DELTA = 0.5

/**
 * One eased step of the explore glide: a fraction of the remaining distance
 * (`smoothing` per 60 Hz frame, applied over `dtMs` of elapsed time), so the
 * slide chases the pointer instead of tracking it 1:1 at the same pace on any
 * refresh rate. Null once the gap is close enough to stop.
 */
export function glideStep(
  pan: { x: number; y: number },
  target: { x: number; y: number },
  smoothing: number,
  dtMs: number
): { x: number; y: number } | null {
  const dx = target.x - pan.x
  const dy = target.y - pan.y
  if (Math.abs(dx) < IDLE_DELTA && Math.abs(dy) < IDLE_DELTA) {
    return null
  }
  const k = lerpFactor(smoothing, dtMs)
  return { x: pan.x + dx * k, y: pan.y + dy * k }
}
