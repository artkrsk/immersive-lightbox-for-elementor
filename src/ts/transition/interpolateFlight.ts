import type { IFlightFrame, IFlightSource, IFlightTarget } from '../interfaces'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * One paint state of the flight at progress `t`: rect travels to the slide,
 * and the inner image un-does its parallax (overscan → 100%, offset → 0) so
 * it lands as a clean, fully-visible slide.
 *
 * Radius is SCALE-AWARE: a plain px lerp collapses the relative curvature
 * the moment the rect grows, which reads as "no radius animation". Instead
 * the source radius scales with the rect (constant relative curvature — the
 * card is being enlarged), blending into the target's designed radius as it
 * lands. Exact at both endpoints.
 */
export function interpolateFlight(from: IFlightSource, to: IFlightTarget, t: number): IFlightFrame {
  const w = lerp(from.rect.w, to.rect.w, t)
  const scale = from.rect.w > 0 ? w / from.rect.w : 1
  return {
    x: lerp(from.rect.x, to.rect.x, t),
    y: lerp(from.rect.y, to.rect.y, t),
    w,
    h: lerp(from.rect.h, to.rect.h, t),
    radius: lerp(from.radius * scale, to.radius, t),
    innerHeightPct: lerp(from.innerHeightPct, 100, t),
    innerOffsetYPct: lerp(from.innerOffsetYPct, 0, t)
  }
}
