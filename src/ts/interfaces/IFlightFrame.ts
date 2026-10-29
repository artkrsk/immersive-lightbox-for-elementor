import type { IRect } from './IRect'

/** One interpolated paint state of the flight element. */
export interface IFlightFrame extends IRect {
  /** How far from the page this frame is: 0 on the page element, 1 on the
   *  slide — the same either way the flight runs, which is what the extras'
   *  fades read (they belong to the page end). */
  t: number
  radius: number
  innerWidthPct: number
  innerHeightPct: number
  innerOffsetXPct: number
  innerOffsetYPct: number
}
