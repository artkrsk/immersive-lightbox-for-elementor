import type PhotoSwipe from '../photoswipe/photoswipe'
import type { IBackdrop } from './IBackdrop'
import type { IFlightLayer } from './IFlightLayer'
import type { IFlightSource } from './IFlightSource'
import type { IOpenRequest } from './IOpenRequest'
import type { IOptions } from './IOptions'

/**
 * Everything the open and close choreographies share. Captured once per
 * open by the transition engine: the flight layer, the backdrop ref (born
 * on firstUpdate, killed by the close), the hidden-source tracker, and the
 * click-time capture of the opened slide's source.
 */
export interface ITransitionContext {
  pswp: PhotoSwipe
  opts: IOptions
  req: IOpenRequest
  flight: IFlightLayer
  backdrop: { current: IBackdrop | null }
  hidden: {
    hide(el: HTMLElement): void
    hideAfterFrames(el: HTMLElement, frames: number): void
  }
  /** Measured at click time, before any layout work. */
  openSource: IFlightSource
}
