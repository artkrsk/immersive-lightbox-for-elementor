import type { IGallery, ILightboxApi } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

const ACTIVE_CLASS = 'arts-lightbox-thumbs__item_active'

/**
 * Bottom thumbnail strip: click-to-jump, active state synced, natively
 * scrollable on overflow. Hidden on touch-width viewports via CSS.
 */
export function registerThumbnailsStrip(
  pswp: PhotoSwipe,
  gallery: IGallery,
  api: ILightboxApi
): void {
  pswp.ui?.registerElement({
    name: 'arts-thumbs',
    className: 'arts-lightbox-thumbs',
    order: 40,
    appendTo: 'root',
    onInit: (el) => {
      const buttons = gallery.slides.map((slide, i) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'arts-lightbox-thumbs__item'
        if (slide.msrc) {
          const img = document.createElement('img')
          img.src = slide.msrc
          img.alt = ''
          button.appendChild(img)
        } else {
          button.textContent = String(i + 1)
        }
        button.addEventListener('click', () => {
          api.goTo(i)
        })
        el.appendChild(button)
        return button
      })
      const sync = (): void => {
        buttons.forEach((button, i) => {
          button.classList.toggle(ACTIVE_CLASS, i === pswp.currIndex)
          if (i === pswp.currIndex) {
            button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
          }
        })
      }
      sync()
      pswp.on('change', sync)
    }
  })
}
