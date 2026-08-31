/**
 * The engine instance handed to consumers through the discovery global.
 *
 * `init()` arms the delegated click handling; `open(el)` opens the lightbox
 * for a candidate element and reports whether it resolved to a gallery —
 * `point` (viewport coords of the triggering click) seeds the initial pan
 * so the opened slide is already aimed at the cursor; `destroy()` tears
 * everything down (safe to call twice).
 */
export interface ILightbox {
  init(): void
  destroy(): void
  /**
   * Runs the close choreography and resolves once the lightbox is gone —
   * what an AJAX theme calls before it swaps the DOM, awaiting the promise
   * if it wants to hold the page transition until the close lands. Resolves
   * immediately when nothing is open; a call while a close is already
   * running joins it; a call during the open choreography closes as soon as
   * the open settles. Not `destroy()`: that also disarms the delegated click
   * handling for the rest of the JS context.
   */
  close(): Promise<void>
  open(el: HTMLElement, point?: { x: number; y: number }): boolean
  readonly version: string
}
