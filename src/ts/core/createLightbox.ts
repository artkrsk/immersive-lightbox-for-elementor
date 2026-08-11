import type { ILightbox } from '../interfaces'

/** Composition root. Inert stub until the real open path lands (Task 7). */
export function createLightbox(): ILightbox {
  return {
    init: () => {},
    destroy: () => {},
    open: () => false,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__
  }
}
