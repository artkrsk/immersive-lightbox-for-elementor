import { ATTR_LIGHTBOX, ATTR_OFF, WC_NATIVE_CLASS } from '../constants'
import { ELEMENTOR_ATTR_OPEN_LIGHTBOX } from '../constants/elementorAttributes'
import { CANDIDATE_SELECTOR, WC_ANCHOR_SELECTOR } from '../constants/selectors'
import { isEligibleBareLink } from './isEligibleBareLink'
import { isLightboxActionHash } from './isLightboxActionHash'
import { passesElementorAnchorGuard } from './passesElementorAnchorGuard'

/** Woo gallery links are implicit opt-ins; downloads and Elementor "no" still win. */
function refusesWooGalleryAnchor(el: HTMLElement): boolean {
  if (!el.matches(WC_ANCHOR_SELECTOR) || el.hasAttribute(ATTR_LIGHTBOX)) {
    return false
  }
  return el.hasAttribute('download') || el.getAttribute(ELEMENTOR_ATTR_OPEN_LIGHTBOX) === 'no'
}

/**
 * The one click-time candidate resolver — every input path (the gate, the
 * engine's delegation, hover prefetch) routes through here so the explicit
 * vocabulary and the kit-switch bare-link fallback can never drift apart.
 * `nativeFallback` is the PHP-resolved `global_image_lightbox` state.
 */
export function matchCandidateElement(
  target: Element | null,
  nativeFallback: boolean
): HTMLElement | null {
  // WooCommerce regained its complete gallery, or the author opted out:
  // neither explicit vocabulary nor Elementor's bare-link fallback may claim
  // a click here.
  if (target?.closest(`.${WC_NATIVE_CLASS}, [${ATTR_OFF}]`)) {
    return null
  }
  const explicit = target?.closest<HTMLElement>(CANDIDATE_SELECTOR)
  if (explicit) {
    // The selector's action-hash arm is broader than what we own: a popup or
    // scroll-to action must reach Elementor's handler, not die on our
    // preventDefault. Only the lightbox action is ours.
    const href = explicit.getAttribute('href') ?? ''
    if (href.startsWith('#elementor-action') && !isLightboxActionHash(href)) {
      return null
    }
    if (refusesWooGalleryAnchor(explicit)) {
      return null
    }
    // Elementor-stamped anchors keep Elementor's own anchor guard: its
    // client rejects a stamped link that carries `download` or a non-image
    // href without the video marker, and claiming one would turn a download
    // or a plain navigation into a broken slide. Our vocabulary is exempt —
    // explicit opt-in is its own contract.
    if (
      explicit.hasAttribute(ELEMENTOR_ATTR_OPEN_LIGHTBOX) &&
      !explicit.hasAttribute(ATTR_LIGHTBOX) &&
      !passesElementorAnchorGuard(explicit)
    ) {
      return null
    }
    return explicit
  }
  if (!nativeFallback) {
    return null
  }
  const anchor = target?.closest<HTMLElement>('a[href]')
  return anchor && isEligibleBareLink(anchor) ? anchor : null
}
