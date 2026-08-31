import type { TFlightMedia } from '../types/TFlightMedia'
import type { IFlightFrame } from './IFlightFrame'

/**
 * The promoted element that travels above the curtain: a fixed-position
 * frame with overflow hidden; the inner media repaints from interpolated
 * overscan/offset percentages each frame.
 *
 * It mounts inside the pswp root, between the slides and the controls, so the
 * travelling image passes under the chrome rather than over it.
 */
export interface IFlightLayer {
  mount(frame: IFlightFrame, media: TFlightMedia): void
  paint(frame: IFlightFrame): void
  /**
   * Repoint the flying image at a better source mid-flight, so it lands at
   * the same resolution the slide underneath will show. Caller decodes
   * first; assigning an undecoded src to a painted element is what flashes.
   */
  upgrade(src: string): void
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
