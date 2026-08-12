import type { TFlightMedia } from '../types/TFlightMedia'
import type { IFlightFrame } from './IFlightFrame'

/**
 * The promoted element that travels above the curtain: a fixed-position
 * frame with overflow hidden; the inner media repaints from interpolated
 * overscan/offset percentages each frame.
 */
export interface IFlightLayer {
  mount(frame: IFlightFrame, media: TFlightMedia): void
  paint(frame: IFlightFrame): void
  /** Element mode: hand the live media out (to the slide / the page slot)
   *  without destroying it. */
  extract(): HTMLElement | null
  /** Element mode: overlay a snapshot of the video's current frame — a
   *  reparented <video> re-attaches its compositor texture and can present
   *  blank for a frame; the snapshot covers that gap. */
  freeze(): void
  unmount(): void
  /** Unmount after N painted frames — aborts if the layer was remounted
   *  meanwhile (an instant close can overlap the open's deferred cleanup). */
  unmountLater(frames: number): void
}
