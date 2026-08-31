import type { ILightboxApi } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { blinkMarkup } from './blinkMarkup'

/**
 * Two rotated bars rather than an SVG X: a single path has nothing for the
 * hover cascade to stagger across, and two bars are the form a burger button
 * takes when opened — so a theme can style the two as one component.
 */
const CLOSE_BARS =
  blinkMarkup('', 'arts-lightbox-close__bar arts-lightbox-close__bar_1') +
  blinkMarkup('', 'arts-lightbox-close__bar arts-lightbox-close__bar_2')

/**
 * Close routes through the api — the curtain choreography, not instant close.
 * A non-empty `icon` replaces the bars wholesale, hover cascade included.
 *
 * No cursor-follower attributes here — see `registerArrows`.
 */
export function registerCloseButton(pswp: PhotoSwipe, api: ILightboxApi, icon: string): void {
  pswp.ui?.registerElement({
    name: 'arts-close',
    className: 'arts-lightbox-close',
    order: 20,
    isButton: true,
    appendTo: 'bar',
    html: icon || CLOSE_BARS,
    onClick: () => {
      api.close()
    }
  })
}
