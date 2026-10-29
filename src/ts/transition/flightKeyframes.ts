import type { IFlightBox, IFlightFrame } from '../interfaces'
import { flightFrameStyles } from './flightFrameStyles'

/**
 * Keyframes between consecutive samples are linear, so a curve the sampling
 * cannot represent exactly (the inner picture's placement under a per-axis
 * outer scale) is a polyline of this many segments. At 24 the largest
 * deviation over an 800ms flight is well under a device pixel.
 */
const SAMPLES = 24

/**
 * The whole flight, sampled over progress for the compositor: the outer box's
 * transform, the inner picture's transform, and the counter-scaled radius.
 * Progress is the EASED value, as `interpolateFlight` reads it — the
 * animation's own easing maps time onto it, so the samples sit uniformly in
 * progress, not in time.
 */
export function flightKeyframes(
  frameAt: (progress: number) => IFlightFrame,
  box: IFlightBox
): { outer: Keyframe[]; inner: Keyframe[]; radius: Keyframe[] } {
  const outer: Keyframe[] = []
  const inner: Keyframe[] = []
  const radius: Keyframe[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const offset = i / SAMPLES
    const style = flightFrameStyles(frameAt(offset), box)
    outer.push({ offset, transform: style.transform })
    inner.push({ offset, transform: style.innerTransform })
    radius.push({ offset, borderRadius: style.borderRadius })
  }
  return { outer, inner, radius }
}
