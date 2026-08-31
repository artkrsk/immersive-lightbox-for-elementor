import { isLightboxActionHash } from './isLightboxActionHash'

/**
 * The settings payload of a lightbox action hash — images carry
 * `{id, url, slideshow?}`, the Video widget its full options object. Null
 * for any other action or malformed input; the collector drops those. The
 * base64 holds UTF-8 bytes, so the atob byte string is decoded properly
 * rather than JSON.parsed raw.
 */
export function decodeActionHash(href: string): Record<string, unknown> | null {
  if (!isLightboxActionHash(href)) {
    return null
  }
  try {
    const decoded = decodeURIComponent(href.slice(1))
    const settings = decoded.slice(decoded.indexOf('&settings=') + '&settings='.length)
    if (!settings) {
      return null
    }
    const bytes = Uint8Array.from(atob(settings), (c) => c.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
