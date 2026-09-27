import { HOST_CLASS } from '../constants'

/**
 * The body child the root mounts in, found fresh every open — an AJAX theme
 * may have swapped the body contents since the last one.
 *
 * It exists so our stylesheet can scope every rule to OUR root: the class
 * names are PhotoSwipe's, and WooCommerce prints a PhotoSwipe 4 `.pswp` of
 * its own, so `.pswp` alone restyled theirs (our `.pswp__bg { display: none }`
 * took their backdrop away).
 *
 * `display: contents` is load-bearing: a box here would become the containing
 * block and stacking context of everything the root paints — the flight's
 * coordinate space, the root's z-index against the page. With no box, the
 * root lays out and stacks exactly as a direct body child. Set through the
 * style property rather than markup, so a strict CSP cannot strip it.
 */
export function acquireLightboxHost(): HTMLElement {
  for (const child of document.body.children) {
    if (child.classList.contains(HOST_CLASS)) {
      return child as HTMLElement
    }
  }
  const host = document.createElement('div')
  host.className = HOST_CLASS
  host.style.display = 'contents'
  document.body.appendChild(host)
  return host
}

/**
 * Gone once empty, so the next open appends a fresh host last in body — the
 * same paint order against the page's own z-index ties as the root appended
 * straight to body had. A host still holding a closing root from an
 * overlapping session stays.
 */
export function releaseLightboxHost(host: HTMLElement): void {
  if (host.childElementCount === 0) {
    host.remove()
  }
}
