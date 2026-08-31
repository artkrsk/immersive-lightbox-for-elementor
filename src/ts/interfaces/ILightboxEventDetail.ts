import type { TSlideType } from '../types/TSlideType'

/**
 * Detail carried by `arts-lightbox:open`, and the base of the
 * `arts-lightbox:change` shape (`ILightboxChangeDetail`). Primitives plus
 * the root element only — no engine objects, no class identity — so a theme
 * never couples to internals that may change. `arts-lightbox:destroy`
 * carries `{ root }` alone.
 */
export interface ILightboxEventDetail {
  /** The pswp root: the DOM anchor for theme chrome. */
  root: HTMLElement
  index: number
  total: number
  /** The caption's title line; empty string when the slide has none. */
  caption: string
  /** The caption's second line; empty string when the slide has none. */
  description: string
  type: TSlideType
}
