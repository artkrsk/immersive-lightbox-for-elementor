import type { IFlightBox, IFlightFrame } from '../interfaces'

/**
 * One frame of the flight as the two transforms the compositor applies to a
 * box that never changes size.
 *
 * The outer element IS the clip: its box is the landing rect, scaled down to
 * the frame's rect — so the scale is per axis, and the corner radius is
 * counter-scaled per axis to read as the designed circle on screen. The inner
 * img fills that box with the picture at the box's own aspect, and its
 * transform places the picture exactly where the page shows it: the page's
 * img rect (`inner*Pct`, measured against the frame) covers the picture at
 * `object-fit: cover`, which is a uniform scale centred in that rect. Both
 * are expressed in the outer's unscaled units, which is why the outer's
 * per-axis scale divides back out.
 */
export function flightFrameStyles(
  frame: IFlightFrame,
  box: IFlightBox
): {
  transform: string
  borderRadius: string
  innerTransform: string
} {
  const sx = box.w > 0 && frame.w > 0 ? frame.w / box.w : 1
  const sy = box.h > 0 && frame.h > 0 ? frame.h / box.h : 1
  const innerW = (frame.w * frame.innerWidthPct) / 100
  const innerH = (frame.h * frame.innerHeightPct) / 100
  const innerX = (frame.w * frame.innerOffsetXPct) / 100
  const innerY = (frame.h * frame.innerOffsetYPct) / 100
  const cover = Math.max(box.w > 0 ? innerW / box.w : 1, box.h > 0 ? innerH / box.h : 1)
  const pictureX = innerX + (innerW - box.w * cover) / 2
  const pictureY = innerY + (innerH - box.h * cover) / 2
  return {
    transform: `translate(${frame.x}px, ${frame.y}px) scale(${sx}, ${sy})`,
    borderRadius: `${frame.radius / sx}px / ${frame.radius / sy}px`,
    innerTransform: `translate(${pictureX / sx}px, ${pictureY / sy}px) scale(${cover / sx}, ${cover / sy})`
  }
}
