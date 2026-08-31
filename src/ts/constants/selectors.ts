import { ATTR_CLONE, ATTR_LIGHTBOX, ATTR_TYPE } from './attributes'
import { ELEMENTOR_ATTR_LIGHTBOX_JSON, ELEMENTOR_ATTR_OPEN_LIGHTBOX } from './elementorAttributes'

/**
 * What the collector (and the delegated click handler) considers openable.
 *
 * Media candidates of ours are anchors and carry their source in href —
 * `data-arts-lightbox-type` overrides how that source is READ, never where
 * it comes from. The one non-anchor arm is `html`, whose content lives in a
 * template the attribute points at: those slides are sourceless by design,
 * so requiring an href would mean inventing one. Elementor's Video widget
 * rides its own arm below, its trigger being a poster div with the payload
 * in an attribute.
 *
 * The Elementor arm matches only the explicit "yes" its PHP always stamps on
 * its own widgets' eligible links — "no" and unstamped links fall through
 * (the kit-switch bare-link fallback is a predicate, not a selector).
 *
 * The action-hash arm is deliberately broad — only `elementor-action`
 * survives the href's percent-encoding — so every click-time consumer MUST
 * route through `matchCandidateElement`, which releases non-lightbox actions
 * (popups, scroll-to) to Elementor's own handler.
 */
export const CANDIDATE_SELECTOR =
  `a[${ATTR_LIGHTBOX}], [${ATTR_LIGHTBOX}][${ATTR_TYPE}="html"], ` +
  `a[${ELEMENTOR_ATTR_OPEN_LIGHTBOX}="yes"], [${ELEMENTOR_ATTR_LIGHTBOX_JSON}], ` +
  `a[href^="#elementor-action"]`

/**
 * A duplicated instance of a candidate: it joins its slide's DOM instances
 * (the flight still launches from the copy you clicked) but never decides
 * where that slide sits.
 *
 * Elementor bundles Swiper 8.4.5, whose `loopCreate()` prepends `loopedSlides`
 * cloneNode copies before the first slide and appends as many after the last,
 * tagging each `swiper-slide-duplicate` — and the Image Carousel loops by
 * default. Without this, first-occurrence-wins ordering would rotate every
 * looped carousel by that count. Themes cloning their own infinite lists mark
 * the copies with the attribute.
 */
export const CLONE_SELECTOR = `.swiper-slide-duplicate, [${ATTR_CLONE}]`
