import type { IGallery, IOpenRequest } from '../interfaces'

/**
 * Maps a clicked element to its gallery and canonical slide index. Clones
 * resolve to the deduped slide while keeping the clicked element as the
 * transition source.
 */
export function resolveOpenRequest(el: HTMLElement, galleries: IGallery[]): IOpenRequest | null {
  for (const gallery of galleries) {
    for (const [key, elements] of gallery.elementsByKey) {
      if (elements.includes(el)) {
        const index = gallery.slides.findIndex((slide) => slide.key === key)
        if (index === -1) {
          return null
        }
        return { gallery, index, sourceElement: el }
      }
    }
  }
  return null
}
