import { detectSlideType } from '../collector/detectSlideType'
import { matchCandidateElement } from '../collector/matchCandidateElement'
import { ATTR_OFF, ATTR_TYPE } from '../constants'
import type { IOptions } from '../interfaces'
import { decodedImages } from '../transition/decodedImages'

/**
 * Warms the full-size image while the user is still on the thumbnail —
 * PhotoSwipe preloads neighbors once OPEN, but has nothing pre-open.
 * `pointerover` covers mice (the hover dwell usually hides the whole
 * fetch and decode); `pointerdown` covers touch, where the press still
 * buys the open transition's duration. The warm-up DECODES, not just
 * fetches: a decoded file is what lets the flight carry the full-size
 * image from its first frame instead of the page's candidate.
 */
export function attachHoverPrefetch(opts: IOptions): () => void {
  if (!opts.prefetch.onHover) {
    return () => {}
  }

  const trigger = (e: Event): void => {
    const el = matchCandidateElement(e.target as Element | null, opts.elementor.nativeFallback)
    if (!el || el.closest(`[${ATTR_OFF}]`)) {
      return
    }
    const href = el.getAttribute('href') ?? ''
    if (!href || detectSlideType(href, el.getAttribute(ATTR_TYPE)) !== 'image') {
      return
    }
    void decodedImages.warm(href)
  }

  const listenerOpts = { passive: true, capture: true } as const
  document.addEventListener('pointerover', trigger, listenerOpts)
  document.addEventListener('pointerdown', trigger, listenerOpts)
  return () => {
    document.removeEventListener('pointerover', trigger, listenerOpts)
    document.removeEventListener('pointerdown', trigger, listenerOpts)
  }
}
