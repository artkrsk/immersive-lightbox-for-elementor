/**
 * Cross-realm-safe replacement for `instanceof HTML*Element`. Elementor's
 * editor re-renders widgets with nodes created in the PARENT window's realm,
 * so `instanceof` against this frame's constructors is falsy for any page
 * element after the first re-render. `nodeType`/`tagName` are host-DOM
 * properties, identical across realms (the framework-wide mitigation — see
 * ArtsUtilities' isHTMLElement / ArtsComponentRuntime's isElement).
 *
 * Vendored locally: this plugin has zero runtime dependencies, period.
 */
export function isTagElement<K extends keyof HTMLElementTagNameMap>(
  value: unknown,
  tag: K
): value is HTMLElementTagNameMap[K] {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Node).nodeType === 1 &&
    (value as Element).tagName.toLowerCase() === tag
  )
}
