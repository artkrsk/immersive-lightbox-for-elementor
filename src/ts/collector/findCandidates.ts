import { ATTR_GROUP, ATTR_OFF, CANDIDATE_SELECTOR, CLONE_SELECTOR } from '../constants'
import { ELEMENTOR_ATTR_SLIDESHOW } from '../constants/elementorAttributes'
import type { ICandidate } from '../interfaces'
import { decodeActionHash } from './decodeActionHash'
import { extractSlideData } from './extractSlideData'
import { matchCandidateElement } from './matchCandidateElement'

// An action-hash trigger carries its slideshow id inside the payload.
function hashGroupId(el: HTMLElement): string | null {
  const slideshow = decodeActionHash(el.getAttribute('href') ?? '')?.slideshow
  return typeof slideshow === 'string' && slideshow ? slideshow : null
}

// Our attribute wins outright — even from an ancestor: an author's explicit
// grouping outranks the slideshow id Elementor stamps per widget.
function resolveGroupId(el: HTMLElement): string | null {
  return (
    el.getAttribute(ATTR_GROUP) ??
    el.closest(`[${ATTR_GROUP}]`)?.getAttribute(ATTR_GROUP) ??
    el.getAttribute(ELEMENTOR_ATTR_SLIDESHOW) ??
    el.closest(`[${ELEMENTOR_ATTR_SLIDESHOW}]`)?.getAttribute(ELEMENTOR_ATTR_SLIDESHOW) ??
    hashGroupId(el)
  )
}

/**
 * All openable elements under `root`, in DOM order, opt-outs excluded.
 * `nativeFallback` widens the sweep to plain image links (Elementor's
 * kit-switch behavior) — one query so slide order still follows the page.
 */
export function findCandidates(root: ParentNode, nativeFallback = false): ICandidate[] {
  const selector = nativeFallback ? `${CANDIDATE_SELECTOR}, a[href]` : CANDIDATE_SELECTOR
  const elements = [...root.querySelectorAll<HTMLElement>(selector)]
  return (
    elements
      // The scan defers to the same resolver every click path uses, so the
      // eligibility guards can never drift between scan time and click time.
      // `=== el` also drops an element whose real candidate is an ancestor.
      .filter((el) => matchCandidateElement(el, nativeFallback) === el)
      .filter((el) => !el.closest(`[${ATTR_OFF}]`))
      .map((el) => ({
        element: el,
        data: extractSlideData(el),
        groupId: resolveGroupId(el),
        // `closest` deliberately matches the element itself: an anchor may
        // carry the marker directly, or sit inside a cloned slide.
        isClone: Boolean(el.closest(CLONE_SELECTOR))
      }))
      .filter(({ data }) => {
        // A candidate whose extraction yielded nothing (a malformed Elementor
        // payload, a non-lightbox action hash) must not become a blank slide.
        // html slides are legitimately sourceless — their content is inline.
        return Boolean(data.src) || data.type === 'html'
      })
  )
}
