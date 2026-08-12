import type { IFlightFrame } from '../interfaces'

/**
 * The frame's CSS, computed apart from the DOM writes.
 *
 * innerTransform is the counterpart to captureFlightSource's geometric
 * measurement: the inner media is sized as a PERCENTAGE of the frame, so its
 * offset — measured in frame terms — has to be re-expressed against that
 * height, not against the frame. This is what makes any parallax mechanism
 * replay identically inside the flight.
 */
export function flightFrameStyles(frame: IFlightFrame): {
  transform: string
  width: string
  height: string
  borderRadius: string
  innerHeight: string
  innerTransform: string
} {
  return {
    transform: `translate(${frame.x}px, ${frame.y}px)`,
    width: `${frame.w}px`,
    height: `${frame.h}px`,
    borderRadius: `${frame.radius}px`,
    innerHeight: `${frame.innerHeightPct}%`,
    innerTransform: `translateY(${(frame.innerOffsetYPct / frame.innerHeightPct) * 100}%)`
  }
}
