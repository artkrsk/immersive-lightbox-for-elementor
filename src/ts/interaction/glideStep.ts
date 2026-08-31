/** Below this (px) the motion is imperceptible — idle rather than spin the
 *  rAF loop on sub-pixel corrections. */
const IDLE_DELTA = 0.5

/**
 * One eased step of the explore glide: a fraction of the remaining distance,
 * so the slide chases the pointer instead of tracking it 1:1. Null once the
 * gap is close enough to stop.
 */
export function glideStep(
  pan: { x: number; y: number },
  target: { x: number; y: number },
  smoothing: number
): { x: number; y: number } | null {
  const dx = target.x - pan.x
  const dy = target.y - pan.y
  if (Math.abs(dx) < IDLE_DELTA && Math.abs(dy) < IDLE_DELTA) {
    return null
  }
  return { x: pan.x + dx * smoothing, y: pan.y + dy * smoothing }
}
