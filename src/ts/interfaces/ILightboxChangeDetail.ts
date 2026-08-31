import type { ILightboxEventDetail } from './ILightboxEventDetail'

/**
 * Detail carried by `arts-lightbox:change` — the shared shape plus where the
 * strip came from and which way it went. Announced at commit, when the
 * destination is decided (press, drag release), not once the slide lands:
 * `index` is the destination, and a committed navigation is never undone.
 */
export interface ILightboxChangeDetail extends ILightboxEventDetail {
  /** The index the previous event announced. */
  previousIndex: number
  /**
   * The way the strip travelled, not the sign of the index delta: a loop
   * wrap goes the short way round (next from the last slide is `1` with
   * `index` 0). Two slides wrap as an index jump the other way — the wrap
   * cannot be painted forward — and report that way.
   */
  direction: 1 | -1
}
