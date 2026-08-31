// Elementor's own lightbox vocabulary, stamped server-side by its widgets
// (Widget_Base::add_lightbox_data_attributes). Read-only for us — the rule is
// "Elementor decides whether a link opens in a lightbox, we decide how" — and
// our own data-arts-lightbox-* attributes always win when both are present.
export const ELEMENTOR_ATTR_OPEN_LIGHTBOX = 'data-elementor-open-lightbox'
export const ELEMENTOR_ATTR_SLIDESHOW = 'data-elementor-lightbox-slideshow'
export const ELEMENTOR_ATTR_TITLE = 'data-elementor-lightbox-title'
export const ELEMENTOR_ATTR_DESCRIPTION = 'data-elementor-lightbox-description'
/** The Video widget's JSON payload — a poster div, not an anchor. */
export const ELEMENTOR_ATTR_LIGHTBOX_JSON = 'data-elementor-lightbox'
/**
 * Pro Media Carousel's video marker: the anchor's href is only the POSTER,
 * the raw embed/file URL rides this attribute — the sole video signal, the
 * same way Elementor's own reader treats it.
 */
export const ELEMENTOR_ATTR_LIGHTBOX_VIDEO = 'data-elementor-lightbox-video'
/**
 * The shareable deep-link carrier. Native widgets stamp the action hash
 * HERE, not into href (the Video widget's trigger is a div with no href at
 * all) — Elementor's own share button builds its URL from this attribute.
 */
export const ELEMENTOR_ATTR_ACTION_HASH = 'data-e-action-hash'
