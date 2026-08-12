import type { IGallery, ILightboxApi, IMediaController, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { registerArrows } from './arrows'
import { registerCaption } from './caption'
import { registerCloseButton } from './closeButton'
import { registerCounter } from './counter'
import { registerDownloadButton } from './downloadButton'
import { createSlideshow } from './slideshow'
import { registerSlideshowButton } from './slideshowButton'
import { registerSoundButton } from './soundButton'
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
  api: ILightboxApi,
  media: IMediaController
): void {
  const slideshow = createSlideshow(opts.slideshow.interval, () => {
    api.next()
  })

  pswp.on('uiRegister', () => {
    registerArrows(pswp, api)
    registerCloseButton(pswp, api)
    registerSoundButton(pswp, media)
    if (opts.ui.counter) {
      registerCounter(pswp, gallery)
    }
    if (opts.ui.captions) {
      registerCaption(pswp, gallery)
    }
    if (opts.ui.download) {
      registerDownloadButton(pswp, gallery)
    }
    if (opts.slideshow.enabled) {
      registerSlideshowButton(pswp, slideshow)
    }
    if (opts.ui.thumbnails) {
      registerThumbnailsStrip(pswp, gallery, api)
    }
  })

  // Any interaction hands control back to the user.
  pswp.on('bindEvents', () => {
    const stop = (): void => {
      slideshow.stop()
    }
    pswp.element?.addEventListener('pointerdown', stop)
    pswp.element?.addEventListener('wheel', stop, { passive: true })
  })
  pswp.on('destroy', () => {
    slideshow.stop()
  })
}
