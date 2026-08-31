import type { IRect } from './IRect'

/** Where the flight lands — the real slide's rect in viewport space. */
export interface IFlightTarget {
  rect: IRect
  radius: number
}
