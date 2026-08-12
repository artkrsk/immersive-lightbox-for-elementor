import type { ILightboxApi } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/** Close routes through the api — the curtain choreography, not instant close. */
export function registerCloseButton(pswp: PhotoSwipe, api: ILightboxApi): void {
  pswp.ui?.registerElement({
    name: 'arts-close',
    className: 'arts-lightbox-close',
    order: 20,
    isButton: true,
    appendTo: 'bar',
    html: CLOSE_SVG,
    onInit: (el) => {
      el.setAttribute('data-arts-cursor-follower-target', '{"magnetic":true}')
    },
    onClick: () => {
      api.close()
    }
  })
}
