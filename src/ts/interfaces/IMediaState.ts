import type { IPlayerBridge } from './IPlayerBridge'
import type { ISlideData } from './ISlideData'

/** Shared mutable registry threaded through the content-layer modules. */
export interface IMediaState {
  bridges: Map<HTMLIFrameElement, IPlayerBridge>
  /** The bridge protocol has no queryable mute state — track what we set. */
  bridgeMuted: Map<HTMLIFrameElement, boolean>
  /**
   * One-shot watch intent: the opened slide's index until its FIRST build
   * consumes it (set to -1). PhotoSwipe rebuilds evicted content — the
   * opened slide re-entering the preload window as a neighbor must come
   * back as a plain paused player (the AGC production bug).
   */
  watchIntent: { index: number }
  /** Session autoplay policy gate: options AND the per-slide opt-out. */
  slideAutoplay(data: ISlideData): boolean
}
