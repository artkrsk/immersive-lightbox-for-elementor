import type { IRect } from './IRect'

/** One interpolated paint state of the flight element. */
export interface IFlightFrame extends IRect {
  radius: number
  innerWidthPct: number
  innerHeightPct: number
  innerOffsetXPct: number
  innerOffsetYPct: number
}
