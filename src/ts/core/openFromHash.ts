import { isLightboxActionHash } from '../collector/isLightboxActionHash'
import { ELEMENTOR_ATTR_ACTION_HASH } from '../constants/elementorAttributes'
import type { ILightbox } from '../interfaces'

/**
 * Elementor's shareable deep link: a page loaded with the lightbox action in
 * `location.hash` opens immediately, no click involved. The engine's open
 * needs a real source element (the flight needs a rect to fly from), so the
 * element already carrying that hash IS the trigger.
 *
 * `data-e-action-hash` is checked first, on ANY element — that is where
 * native widgets stamp the hash (their href is the real image URL, and the
 * Video widget's trigger is a div with no href at all), and it is what
 * Elementor's own share button builds URLs from. The href scan is the
 * fallback for Pro's Lightbox dynamic tag, whose whole href IS the hash.
 * A hash with no backing element is a silent no-op by design.
 */
export function openFromHash(lightbox: ILightbox): void {
  const hash = window.location.hash
  if (!isLightboxActionHash(hash)) {
    return
  }
  for (const el of document.querySelectorAll<HTMLElement>(`[${ELEMENTOR_ATTR_ACTION_HASH}]`)) {
    if (el.getAttribute(ELEMENTOR_ATTR_ACTION_HASH) === hash) {
      lightbox.open(el)
      return
    }
  }
  for (const anchor of document.querySelectorAll<HTMLElement>('a[href^="#elementor-action"]')) {
    if (anchor.getAttribute('href') === hash) {
      lightbox.open(anchor)
      return
    }
  }
}
