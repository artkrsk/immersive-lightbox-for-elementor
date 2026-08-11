import type PhotoSwipe from 'photoswipe'
import type { IGallery } from '../interfaces'

/** Bottom-left caption from the slide model, synced on slide change. */
export function registerCaption(pswp: PhotoSwipe, gallery: IGallery): void {
  pswp.ui?.registerElement({
    name: 'arts-caption',
    className: 'arts-lightbox-caption',
    order: 30,
    appendTo: 'root',
    onInit: (el) => {
      const update = (): void => {
        el.textContent = gallery.slides[pswp.currIndex]?.caption ?? ''
      }
      update()
      pswp.on('change', update)
    }
  })
}
