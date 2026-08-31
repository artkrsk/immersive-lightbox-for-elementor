import type { IPlayerBridge } from './IPlayerBridge'
import type { ISlideData } from './ISlideData'

/** Shared mutable registry threaded through the content-layer modules. */
export interface IMediaState {
  bridges: Map<HTMLIFrameElement, IPlayerBridge>
  /**
   * The opened slide's index until its FIRST build consumes it (set to -1).
   * Every slide plays on arrival, so this no longer decides sound — it
   * decides whether an EMBED's URL may carry autoplay=1, which fires the
   * moment the iframe loads, activated or not. PhotoSwipe rebuilds evicted
   * content, so the opened slide re-entering the preload window as a
   * neighbor must come back disarmed (the AGC production bug).
   */
  watchIntent: { index: number }
  /** Session autoplay policy gate: options AND the per-slide opt-out. */
  slideAutoplay(data: ISlideData): boolean
}
