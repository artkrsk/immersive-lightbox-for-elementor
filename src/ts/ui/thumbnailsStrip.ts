import type { IGallery, ILightboxApi, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { wrap } from '../utils/wrap'
import { onSlidePosition } from './slidePosition'

const ACTIVE_CLASS = 'arts-lightbox-thumbs__item_active'

/**
 * Thumbnail strip on any edge: click-to-jump, active state synced, and the
 * scroll position read from the gallery rather than caught up afterwards — so
 * the strip tracks a drag and reverses with it instead of lurching once the
 * slide has already landed. Hidden on touch-width viewports via CSS.
 */
export function registerThumbnailsStrip(
  pswp: PhotoSwipe,
  gallery: IGallery,
  api: ILightboxApi,
  position: IOptions['ui']['thumbnailsPosition']
): void {
  const vertical = position === 'left' || position === 'right'
  pswp.ui?.registerElement({
    name: 'arts-thumbs',
    className: `arts-lightbox-thumbs arts-lightbox-thumbs_${position}`,
    order: 40,
    appendTo: 'root',
    onInit: (el) => {
      const total = gallery.slides.length
      const buttons = gallery.slides.map((slide, i) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'arts-lightbox-thumbs__item'
        if (slide.msrc) {
          const img = document.createElement('img')
          img.src = slide.msrc
          img.alt = ''
          img.loading = 'lazy'
          button.appendChild(img)
        } else {
          // Video embeds and html slides often have no poster to borrow.
          button.textContent = String(i + 1)
        }
        button.addEventListener('click', () => {
          api.goTo(i)
        })
        el.appendChild(button)
        return button
      })

      let active = -1
      onSlidePosition(pswp, (raw) => {
        const at = wrap(raw, total)

        // The highlight is genuinely discrete — a thumbnail is the current one
        // or it is not — so only the scroll glides.
        const nearest = Math.round(at) % total
        if (nearest !== active) {
          buttons[active]?.classList.remove(ACTIVE_CLASS)
          buttons[nearest]?.classList.add(ACTIVE_CLASS)
          active = nearest
        }

        // Reading this container's own scroll extent, which is unavoidable for
        // centring and is not the "size one element from another" coupling the
        // caption avoids. Items are uniform because we size them.
        const extent = vertical ? el.scrollHeight : el.scrollWidth
        const visible = vertical ? el.clientHeight : el.clientWidth
        const pitch = extent / total
        const target = Math.max(0, Math.min(at * pitch + pitch / 2 - visible / 2, extent - visible))
        if (vertical) {
          el.scrollTop = target
        } else {
          el.scrollLeft = target
        }
      })
    }
  })
}
