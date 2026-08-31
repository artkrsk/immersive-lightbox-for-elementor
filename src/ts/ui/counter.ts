import type { IGallery } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * "01 / 06" indicator. Reads `potentialIndex` and updates at commit
 * (`potentialIndexChange`), like the rest of the chrome — `currIndex` only
 * lands once the spring settles. `change` stays subscribed for the init-time
 * sync: the index is assigned after the UI is built.
 */
export function registerCounter(pswp: PhotoSwipe, gallery: IGallery): void {
  pswp.ui?.registerElement({
    name: 'arts-counter',
    className: 'arts-lightbox-counter',
    order: 1,
    appendTo: 'bar',
    onInit: (el) => {
      const update = (): void => {
        el.textContent = `${pad(pswp.potentialIndex + 1)} / ${pad(gallery.slides.length)}`
      }
      update()
      pswp.on('potentialIndexChange', update)
      pswp.on('change', update)
    }
  })
}
