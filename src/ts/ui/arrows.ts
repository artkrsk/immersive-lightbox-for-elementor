import type { ILightboxApi, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { blinkMarkup } from './blinkMarkup'

/** Cursor-follower rides along declaratively; inert without the plugin. */
const CURSOR_PAYLOAD = '{"magnetic":true,"scale":"24px"}'

/** Prev/next arrows, routed through the api so pass-through applies. */
export function registerArrows(
  pswp: PhotoSwipe,
  api: ILightboxApi,
  icons: Pick<IOptions['ui']['icons'], 'prev' | 'next'>
): void {
  pswp.ui?.registerElement({
    name: 'arts-arrow-prev',
    className: 'arts-lightbox-arrow arts-lightbox-arrow_prev',
    order: 10,
    isButton: true,
    appendTo: 'wrapper',
    html: blinkMarkup(icons.prev),
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
    html: blinkMarkup(icons.next),
    onInit: (el) => {
      el.setAttribute('data-arts-cursor-follower-target', CURSOR_PAYLOAD)
    },
    onClick: () => {
      api.next()
    }
  })
}
