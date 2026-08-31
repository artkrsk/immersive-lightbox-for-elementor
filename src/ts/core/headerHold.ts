/** Arts Header for Elementor's zone vocabulary. Theirs, written by us. */
const HIDE_OVER_ATTR = 'data-arts-header-hide-over'

/**
 * `in-view` of their three modes: the bar hides while any part of the zone is
 * on screen, which for a viewport-filling root means the whole time it is up.
 */
const HIDE_OVER_MODE = 'in-view'

/**
 * Hold the site header down for as long as the lightbox is open, through that
 * plugin's own zone attribute rather than its JS API.
 *
 * Declarative on purpose. Their engine watches the body subtree for this
 * attribute, so a root appended after boot is picked up with no import, no
 * global lookup and nothing to tear down — the same shape as the
 * `data-lenis-prevent` contract stamped beside it. With the plugin absent the
 * attribute means nothing to anyone, which is the right way for this to fail.
 *
 * Their hide flag is separate from the directional auto-hide, so releasing
 * this does not force the bar back — it hands the decision to whatever the
 * scroll direction had it doing.
 */
export function holdHeader(el: HTMLElement): void {
  el.setAttribute(HIDE_OVER_ATTR, HIDE_OVER_MODE)
}

/**
 * Must run while the root is still in the document: their observer is scoped
 * to the body subtree, so a detached node's mutations never reach it and the
 * zone would sit stale until the next scroll evaluated its collapsed rect.
 */
export function releaseHeader(el: HTMLElement): void {
  el.removeAttribute(HIDE_OVER_ATTR)
}
