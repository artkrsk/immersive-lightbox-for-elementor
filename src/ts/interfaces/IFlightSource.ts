import type { IRect } from './IRect'

/**
 * The clicked element's visual state, captured geometrically: the inner
 * image's overscan and offset are measured from bounding rects, so any
 * parallax mechanism (transform, top offset, scale) is captured the same way.
 */
export interface IFlightSource {
  rect: IRect
  radius: number
  /** Inner image height as % of the frame (100 = no overscan). */
  innerHeightPct: number
  /** Inner image top offset as % of the frame height (0 = flush). */
  innerOffsetYPct: number
  /** The source element's displayed image — the img's own src, or a video's
   *  poster. */
  src: string
}
