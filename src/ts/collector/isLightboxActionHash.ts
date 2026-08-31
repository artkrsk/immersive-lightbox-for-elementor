/**
 * Whether an href is Elementor's lightbox action deep link. The DOM literal
 * is percent-encoded — PHP builds `'#'.rawurlencode('elementor-action:…')` —
 * so only `#elementor-action` survives encoding verbatim; the action name is
 * checked after decoding. Deliberately cheap (no base64, no JSON): click
 * paths call this to decide whether to claim the event at all, and a popup
 * or scroll-to action must pass through to Elementor's own handler.
 */
export function isLightboxActionHash(href: string): boolean {
  if (!href.startsWith('#elementor-action')) {
    return false
  }
  try {
    return decodeURIComponent(href.slice(1)).startsWith('elementor-action:action=lightbox&')
  } catch {
    return false
  }
}
