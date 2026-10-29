import type { TFlightExtraKind } from '../types/TFlightExtraKind'

/**
 * An element inside the trigger that rides the flight, captured with the
 * source: where it sits in the frame, how big it is on screen, and the
 * computed values its clone needs once it is cut off from its ancestors.
 */
export interface IFlightExtra {
  kind: TFlightExtraKind
  element: HTMLElement
  /** Position and size as fractions of the frame rect. */
  x: number
  y: number
  w: number
  h: number
  /** Screen size at capture, px — the clone's box, never scaled. */
  width: number
  height: number
  /** The trigger matched `:hover` at capture; the clone shows that look. */
  hover: boolean
  /** Captured `opacity`: the fade starts from it. */
  opacity: number
  /** Computed values written inline on the clone (camelCase CSSOM names). */
  styles: Record<string, string>
}
