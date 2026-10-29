import type { IFlightBox, IFlightExtra, IFlightFrame } from '../interfaces'
import { flightExtraTransform } from './flightExtraTransform'
import { flightFrameStyles } from './flightFrameStyles'

/**
 * Keyframes between consecutive samples are linear, so a curve the sampling
 * cannot represent exactly (the inner picture's placement under a per-axis
 * outer scale) is a polyline of this many segments. At 24 the largest
 * deviation over an 800ms flight is well under a device pixel.
 */
const SAMPLES = 24

/**
 * How far from the page (`IFlightFrame.t`) the extras are gone. Both sit in
 * the slow start of the default curve, so a caption fades while it has barely
 * moved and a tint dissolves before the picture has grown much. The close
 * runs the frames the other way, so the same numbers fade them back in as
 * the flight nears the page.
 */
const FADE_END = { caption: 0.35, veil: 0.5 } as const

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * The whole flight, sampled over progress for the compositor: the outer box's
 * transform, the inner picture's transform, the counter-scaled radius, and
 * for every extra its opacity (and, for a caption, its placement). Progress
 * is the EASED value, as `interpolateFlight` reads it — the animation's own
 * easing maps time onto it, so the samples sit uniformly in progress, not in
 * time. Tracks come back flat, in the order the layer animates them.
 */
export function flightKeyframes(
  frameAt: (progress: number) => IFlightFrame,
  box: IFlightBox,
  extras: readonly IFlightExtra[] = []
): { outer: Keyframe[]; inner: Keyframe[]; radius: Keyframe[]; extras: Keyframe[][] } {
  const outer: Keyframe[] = []
  const inner: Keyframe[] = []
  const radius: Keyframe[] = []
  const extraTracks: Keyframe[][] = extras.flatMap((extra) =>
    extra.kind === 'caption' ? [[], []] : [[]]
  )
  for (let i = 0; i <= SAMPLES; i++) {
    const offset = i / SAMPLES
    const frame = frameAt(offset)
    const style = flightFrameStyles(frame, box)
    outer.push({ offset, transform: style.transform })
    inner.push({ offset, transform: style.innerTransform })
    radius.push({ offset, borderRadius: style.borderRadius })
    let track = 0
    for (const extra of extras) {
      if (extra.kind === 'caption') {
        extraTracks[track++]?.push({
          offset,
          transform: flightExtraTransform(frame, box, extra, i === 0 || i === SAMPLES)
        })
      }
      extraTracks[track++]?.push({
        offset,
        opacity: extra.opacity * clamp01(1 - frame.t / FADE_END[extra.kind])
      })
    }
  }
  return { outer, inner, radius, extras: extraTracks }
}
