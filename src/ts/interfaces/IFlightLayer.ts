import type { TEasingName } from '../types'
import type { TFlightMedia } from '../types/TFlightMedia'
import type { IFlightBox } from './IFlightBox'
import type { IFlightFrame } from './IFlightFrame'

/**
 * The promoted element that travels above the curtain: a fixed-position box
 * the size of the landing rect, clipped, carrying one img. It is rastered
 * ONCE — nothing about it changes size — and the compositor moves it: the
 * whole flight is keyframes on the outer and inner transforms, driven beside
 * the JS clock with the same duration and curve.
 *
 * It mounts inside the pswp root, between the slides and the controls, so the
 * travelling image passes under the chrome rather than over it.
 */
export interface IFlightLayer {
  mount(box: IFlightBox, media: TFlightMedia): void
  /**
   * Run the flight: `frameAt` is sampled over eased progress 0..1 and the
   * result handed to the compositor. Replaces any flight in progress.
   */
  fly(frameAt: (progress: number) => IFlightFrame, duration: number, easing: TEasingName): void
  /** Re-sample a flight in progress for a landing rect that moved; the
   *  animation keeps its time, only its keyframes change. */
  retarget(frameAt: (progress: number) => IFlightFrame): void
  /** Fade IN from transparent right after mount — the close cover for a
   *  playing video dissolves over it instead of hard-swapping. */
  arrive(): void
  /** Fade out and unmount when the fade finishes. Open hand-off only — the
   *  close needs its cover to disappear outright, see `unmountLater`. */
  leave(): void
  /** Move to `body`, for the frames that have to outlive the root's teardown. */
  detach(): void
  unmount(): void
  /** Unmount after N painted frames — aborts if the layer was remounted
   *  meanwhile (an instant close can overlap the open's deferred cleanup). */
  unmountLater(frames: number): void
}
