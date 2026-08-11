import type { IFlightFrame, IFlightSource, IFlightTarget } from '../interfaces'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * One paint state of the flight at progress `t`: rect travels to the slide,
 * radius eases to the slide's, and the inner image un-does its parallax
 * (overscan → 100%, offset → 0) so it lands as a clean, fully-visible slide.
 */
export function interpolateFlight(from: IFlightSource, to: IFlightTarget, t: number): IFlightFrame {
  return {
    x: lerp(from.rect.x, to.rect.x, t),
    y: lerp(from.rect.y, to.rect.y, t),
    w: lerp(from.rect.w, to.rect.w, t),
    h: lerp(from.rect.h, to.rect.h, t),
    radius: lerp(from.radius, to.radius, t),
    innerHeightPct: lerp(from.innerHeightPct, 100, t),
    innerOffsetYPct: lerp(from.innerOffsetYPct, 0, t)
  }
}
