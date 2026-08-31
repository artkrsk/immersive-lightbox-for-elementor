/** Velocity smoothing across wheel events: how much of the new sample lands. */
const VELOCITY_BLEND = 0.3

/**
 * One fingers-on-glass step: where the strip goes for this wheel delta, and
 * the velocity carried forward. Displacement is clamped to one slide either
 * side of the CURRENT index, so a fast flick cannot outrun the strip.
 *
 * Deliberately does NOT decide an index commit — see indexShiftFor.
 */
export function followStrip(input: {
  x: number
  currX: number
  slideWidth: number
  deltaX: number
  velocityX: number
  dt: number
}): { nextX: number; velocityX: number } {
  const { x, currX, slideWidth, deltaX, velocityX, dt } = input
  const nextX = Math.max(currX - slideWidth, Math.min(currX + slideWidth, x - deltaX))
  return {
    nextX,
    velocityX: velocityX * (1 - VELOCITY_BLEND) + ((nextX - x) / dt) * VELOCITY_BLEND
  }
}

/**
 * The mid-gesture index commit: the strip fully reached a neighbor, so rebase
 * the clamp there and let swipes chain.
 *
 * Feed this the strip's ACTUAL x read back after moveTo, never the x that was
 * requested — the fork applies end friction inside moveTo when the gallery
 * cannot loop, and a boundary the strip never actually crossed must not
 * commit.
 */
export function indexShiftFor(x: number, currX: number, slideWidth: number): -1 | 0 | 1 {
  const shift = x - currX
  if (Math.abs(shift) < slideWidth - 1) {
    return 0
  }
  return shift < 0 ? 1 : -1
}
