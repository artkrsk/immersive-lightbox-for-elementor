import { ATTR_OFF, CANDIDATE_SELECTOR, LINK_CLASS } from '../constants'
import { matchCandidateElement } from './matchCandidateElement'

/**
 * Stamps the marker class on every candidate link, so selector-driven
 * consumers (a cursor follower's rules, plain theme CSS) can see what the
 * click-time resolver knows — candidacy itself is not expressible as a CSS
 * selector (the kit's bare-link switch, Elementor's anchor guard, the
 * action-hash release are all predicates).
 *
 * Routes through `matchCandidateElement` like every other input path, plus
 * the explicit `off`-ancestor filter that resolver leaves to collection
 * (`findCandidates`) — off wins over everything, marks included. Re-running
 * drops stale marks first, so AJAX-swapped DOM converges. Ends by nudging a
 * present cursor follower to re-resolve a hover held across the re-scan.
 */
export function markCandidates(nativeFallback: boolean): void {
  const selector = nativeFallback ? `${CANDIDATE_SELECTOR}, a[href]` : CANDIDATE_SELECTOR
  const matched = new Set<Element>()
  for (const el of document.querySelectorAll(selector)) {
    if (matchCandidateElement(el, nativeFallback) === el && !el.closest(`[${ATTR_OFF}]`)) {
      matched.add(el)
    }
  }
  for (const el of document.querySelectorAll(`.${LINK_CLASS}`)) {
    if (!matched.has(el)) {
      el.classList.remove(LINK_CLASS)
    }
  }
  for (const el of matched) {
    el.classList.add(LINK_CLASS)
  }
  // Optional CALL: refresh() may be absent on an older follower build.
  window.artsCursor?.get()?.refresh?.()
}
