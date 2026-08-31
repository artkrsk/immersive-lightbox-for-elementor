const TRACKING_PARAM = /^(utm_|fbclid$|gclid$)/

/**
 * Canonical URL identity for dedup: strips the hash and tracking params,
 * keeps meaningful query params, resolves relative URLs when possible.
 */
export function normalizeUrlKey(href: string, base?: string): string {
  try {
    const url = new URL(href, base ?? 'http://localhost/')
    url.hash = ''
    const keys = [...url.searchParams.keys()]
    for (const key of keys) {
      if (TRACKING_PARAM.test(key)) {
        url.searchParams.delete(key)
      }
    }
    return url.toString()
  } catch {
    return href
  }
}
