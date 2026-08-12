import type { ILightboxApi } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const ARROW_SVG = (flipped: boolean): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"${
    flipped ? ' style="transform: scaleX(-1)"' : ''
  }><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`

/** Cursor-follower rides along declaratively; inert without the plugin. */
const CURSOR_PAYLOAD = '{"magnetic":true,"scale":"24px"}'

/** Prev/next arrows, routed through the api so pass-through applies. */
export function registerArrows(pswp: PhotoSwipe, api: ILightboxApi): void {
  pswp.ui?.registerElement({
    name: 'arts-arrow-prev',
    className: 'arts-lightbox-arrow arts-lightbox-arrow_prev',
    order: 10,
    isButton: true,
    appendTo: 'wrapper',
    html: ARROW_SVG(true),
    onInit: (el) => {
      el.setAttribute('data-arts-cursor-follower-target', CURSOR_PAYLOAD)
    },
    onClick: () => {
      api.prev()
    }
  })
  pswp.ui?.registerElement({
    name: 'arts-arrow-next',
    className: 'arts-lightbox-arrow arts-lightbox-arrow_next',
    order: 11,
    isButton: true,
    appendTo: 'wrapper',
    html: ARROW_SVG(false),
    onInit: (el) => {
      el.setAttribute('data-arts-cursor-follower-target', CURSOR_PAYLOAD)
    },
    onClick: () => {
      api.next()
    }
  })
}
