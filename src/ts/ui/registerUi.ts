import type { IGallery, ILightboxApi, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { registerArrows } from './arrows'
import { registerCaption } from './caption'
import { registerCloseButton } from './closeButton'
import { registerCounter } from './counter'
import { registerThumbnailsStrip } from './thumbnailsStrip'

/**
 * Installs our chrome on the pswp core (its stock UI is fully suppressed).
 * Everything registers on 'uiRegister'; opacity rides the shared transition
 * clock via --arts-lightbox-chrome.
 */
export function registerUi(
  pswp: PhotoSwipe,
  gallery: IGallery,
  opts: IOptions,
  api: ILightboxApi
): void {
  // A single slide has nowhere to go: arrows are broken promises, a 01/01
  // counter is noise, and a one-item strip lists where you already are. None
  // of them register.
  const navigable = gallery.slides.length > 1
  const showThumbs = opts.ui.thumbnails && navigable

  pswp.on('firstUpdate', () => {
    // The theme's mount point for top-row chrome (DEVELOPERS.md). The
    // bar exists by now: the close button is unconditional and creates it.
    pswp.topBar?.classList.add('arts-lightbox-bar')
    if (showThumbs) {
      // On the root, not the strip: the arrows and the caption move aside for
      // a rail, and neither is a descendant of it.
      pswp.element?.classList.add(`arts-lightbox-has-thumbs_${opts.ui.thumbnailsPosition}`)
    }
  })

  pswp.on('uiRegister', () => {
    if (navigable) {
      registerArrows(pswp, api, opts.ui.icons, {
        total: gallery.slides.length,
        endStops: !opts.gallery.loop
      })
    }
    registerCloseButton(pswp, api, opts.ui.icons.close)
    if (opts.ui.counter && navigable) {
      registerCounter(pswp, gallery)
    }
    // Captions are not navigation — a lone slide still gets to say what it is.
    if (opts.ui.captions) {
      registerCaption(pswp, gallery)
    }
    if (showThumbs) {
      registerThumbnailsStrip(pswp, gallery, api, opts.ui.thumbnailsPosition)
    }
  })
}
