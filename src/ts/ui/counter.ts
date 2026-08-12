import type { IGallery } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const pad = (n: number): string => String(n).padStart(2, '0')

/** "01 / 06" indicator, synced on every slide change. */
export function registerCounter(pswp: PhotoSwipe, gallery: IGallery): void {
  pswp.ui?.registerElement({
    name: 'arts-counter',
    className: 'arts-lightbox-counter',
    order: 1,
    appendTo: 'bar',
    onInit: (el) => {
      const update = (): void => {
        el.textContent = `${pad(pswp.currIndex + 1)} / ${pad(gallery.slides.length)}`
      }
      update()
      pswp.on('change', update)
    }
  })
}
