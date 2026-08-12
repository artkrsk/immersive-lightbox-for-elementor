import { ATTR_LIGHTBOX, ATTR_TYPE } from './attributes'

/**
 * What the collector (and the delegated click handler) considers openable.
 * Anchors carry their source in href; non-anchor candidates (background
 * video widgets) must declare their type and contain their media.
 */
export const CANDIDATE_SELECTOR = `a[${ATTR_LIGHTBOX}], [${ATTR_LIGHTBOX}][${ATTR_TYPE}]`
