import type { ILightboxApi, IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { isRTLDocument } from '../utils/isRTLDocument'
import { blinkMarkup } from './blinkMarkup'
import { onSlidePosition } from './slidePosition'

const HIDDEN_CLASS = 'arts-lightbox-arrow_hidden'

/**
 * Prev/next arrows, routed through the api like every other control.
 *
 * With `bounds.endStops` (no loop) the dead arrow at each end hides — an
 * arrow that does nothing is a broken promise. The state is read from the
 * live slide position like all our chrome, so it tracks a drag toward the
 * boundary rather than snapping after it.
 *
 * Deliberately free of cursor-follower attributes: hints belong to that
 * plugin's own rule scopes (keyed off these stable class names), where its
 * Site Settings and translations apply. State here, hints there.
 */
export function registerArrows(
  pswp: PhotoSwipe,
  api: ILightboxApi,
  icons: Pick<IOptions['ui']['icons'], 'prev' | 'next'>,
  bounds?: { total: number; endStops: boolean }
): void {
  let prevEl: HTMLElement | null = null
  let nextEl: HTMLElement | null = null

  // The buttons swap sides under `dir="rtl"` (logical insets in _ui.scss), so
  // they swap glyphs with them: prev sits where reading starts and must point
  // back the way reading came from. Swapping WHICH glyph renders — never
  // mirroring one with a transform — is what keeps a theme's replacement pair
  // rendering exactly as authored, per this option's "two unrelated glyphs"
  // contract.
  const rtl = isRTLDocument()
  const prevIcon = rtl ? icons.next : icons.prev
  const nextIcon = rtl ? icons.prev : icons.next

  pswp.ui?.registerElement({
    name: 'arts-arrow-prev',
    className: 'arts-lightbox-arrow arts-lightbox-arrow_prev',
    order: 10,
    isButton: true,
    appendTo: 'wrapper',
    html: blinkMarkup(prevIcon),
    onInit: (el) => {
      prevEl = el
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
    html: blinkMarkup(nextIcon),
    onInit: (el) => {
      nextEl = el
    },
    onClick: () => {
      api.next()
    }
  })

  if (bounds?.endStops) {
    const last = bounds.total - 1
    onSlidePosition(pswp, (raw) => {
      const nearest = Math.min(last, Math.max(0, Math.round(raw)))
      prevEl?.classList.toggle(HIDDEN_CLASS, nearest === 0)
      nextEl?.classList.toggle(HIDDEN_CLASS, nearest === last)
    })
  }
}
