import type { IFlightBox, IFlightExtra, IFlightFrame } from '../interfaces'
import { snapPx } from '../utils/snapPx'

/**
 * Where a captioned extra sits inside the flight at one frame, in the outer
 * box's unscaled units: its corner keeps its fraction of the frame while its
 * box keeps its screen size, so the outer's per-axis scale is divided out of
 * both. `snap` lands the screen corner on a device pixel — for the two ends
 * of a flight, where the clone sits over the real element it stands in for
 * and a fractional offset would read as a hop at the swap.
 */
export function flightExtraTransform(
  frame: IFlightFrame,
  box: IFlightBox,
  extra: IFlightExtra,
  snap: boolean
): string {
  const sx = box.w > 0 && frame.w > 0 ? frame.w / box.w : 1
  const sy = box.h > 0 && frame.h > 0 ? frame.h / box.h : 1
  let screenX = frame.x + frame.w * extra.x
  let screenY = frame.y + frame.h * extra.y
  if (snap) {
    screenX = snapPx(screenX)
    screenY = snapPx(screenY)
  }
  return `translate(${(screenX - frame.x) / sx}px, ${(screenY - frame.y) / sy}px) scale(${1 / sx}, ${1 / sy})`
}
