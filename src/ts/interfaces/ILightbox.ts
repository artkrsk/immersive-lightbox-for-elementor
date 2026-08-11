/**
 * The engine instance handed to consumers through the discovery global.
 *
 * `init()` arms the delegated click handling; `open(el)` opens the lightbox
 * for a candidate element and reports whether it resolved to a gallery;
 * `destroy()` tears everything down (safe to call twice).
 */
export interface ILightbox {
  init(): void
  destroy(): void
  open(el: HTMLElement): boolean
  readonly version: string
}
