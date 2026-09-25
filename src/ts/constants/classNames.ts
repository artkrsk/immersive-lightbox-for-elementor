/** The real slide stays hidden under this class until the flight lands. */
export const TRANSITIONING_CLASS = 'arts-lightbox-transitioning'
/** On the root for the whole close; the lightbox stops answering the pointer. */
export const CLOSING_CLASS = 'arts-lightbox-closing'
/** Stamped on every candidate link while the plugin owns clicks (markCandidates). */
export const LINK_CLASS = 'arts-lightbox-link'
/**
 * The body child our root mounts in while open. Every lightbox rule nests
 * under it, so a second PhotoSwipe on the page (WooCommerce ships one under
 * the same class names) never picks up our styles.
 */
export const HOST_CLASS = 'arts-lightbox-host'
/** Internal WooCommerce gallery ownership markers, stamped on its root. */
export const WC_GALLERY_CLASS = 'arts-lightbox-wc-gallery'
export const WC_NATIVE_CLASS = 'arts-lightbox-wc-native'
