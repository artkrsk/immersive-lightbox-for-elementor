import { ELEMENTOR_ATTR_LIGHTBOX_VIDEO } from '../constants/elementorAttributes'
import { isTagElement } from '../utils/isTagElement'

// Elementor's regex verbatim (lightbox-manager.js isLightboxLink), anchored:
// a `?` anywhere before the extension breaks [^?]+, so /redirect.php?x=a.jpg
// is NOT an image link to Elementor — and therefore not to us.
const IMAGE_EXTENSION = /^[^?]+\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i

/**
 * The anchor half of Elementor's eligibility check, shared by the stamped
 * arm and the bare-link fallback (Elementor applies it identically to both —
 * only the yes-vs-kit-switch half differs): a `download` link is never
 * claimed, a non-image href only when the video marker vouches for it.
 * Non-anchors pass — the guard is specifically about what an <a> navigates
 * to. Our own vocabulary is exempt at the call sites: explicit opt-in is its
 * own contract.
 *
 * Not a byte-for-byte port: `download` loses here unconditionally, while
 * Elementor's own guard is `(download || !image) && !videoMarker`, so a
 * download link carrying the video marker still passes for it.
 */
export function passesElementorAnchorGuard(el: HTMLElement): boolean {
  if (!isTagElement(el, 'a')) {
    return true
  }
  if (el.hasAttribute('download')) {
    return false
  }
  return (
    IMAGE_EXTENSION.test(el.getAttribute('href') ?? '') ||
    el.hasAttribute(ELEMENTOR_ATTR_LIGHTBOX_VIDEO)
  )
}
