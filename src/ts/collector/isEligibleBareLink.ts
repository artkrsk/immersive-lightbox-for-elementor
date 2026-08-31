import { ATTR_OFF } from '../constants/attributes'
import { ELEMENTOR_ATTR_OPEN_LIGHTBOX } from '../constants/elementorAttributes'
import { passesElementorAnchorGuard } from './passesElementorAnchorGuard'

/**
 * Elementor's client-side-only fallback, replicated: with the kit switch on,
 * any plain image link opens in the lightbox — no attributes required. Its
 * anchor guard applies verbatim (`download`, the anchored extension regex,
 * the video-marker bypass), plus an explicit "no" and our own opt-out so
 * `data-arts-lightbox-off` keeps meaning "never", in every vocabulary. Only
 * consulted when the resolved kit switch says so — the caller owns that
 * flag; this predicate owns the per-element verdict.
 */
export function isEligibleBareLink(el: HTMLElement): boolean {
  if (el.tagName !== 'A') {
    return false
  }
  if (el.getAttribute(ELEMENTOR_ATTR_OPEN_LIGHTBOX) === 'no') {
    return false
  }
  if (el.closest(`[${ATTR_OFF}]`)) {
    return false
  }
  return passesElementorAnchorGuard(el)
}
