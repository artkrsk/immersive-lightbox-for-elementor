import { detectSlideType } from '../collector/detectSlideType'
import { matchCandidateElement } from '../collector/matchCandidateElement'
import { ATTR_OFF, ATTR_TYPE } from '../constants'
import type { IOptions } from '../interfaces'

/**
 * Warms the full-size image while the user is still on the thumbnail —
 * PhotoSwipe preloads neighbors once OPEN, but has nothing pre-open.
 * `pointerover` covers mice (the hover dwell usually hides the whole
 * fetch); `pointerdown` covers touch, where the press still buys the
 * open transition's duration. One request per URL, images only.
 */
export function attachHoverPrefetch(opts: IOptions): () => void {
  if (!opts.prefetch.onHover) {
    return () => {}
  }
  const seen = new Set<string>()
  // Hold references until settled so GC can't abort in-flight fetches.
  const pending = new Map<string, HTMLImageElement>()

  const trigger = (e: Event): void => {
    const el = matchCandidateElement(e.target as Element | null, opts.elementor.nativeFallback)
    if (!el || el.closest(`[${ATTR_OFF}]`)) {
      return
    }
    const href = el.getAttribute('href') ?? ''
    if (!href || seen.has(href)) {
      return
    }
    seen.add(href)
    if (detectSlideType(href, el.getAttribute(ATTR_TYPE)) !== 'image') {
      return
    }
    const img = new Image()
    pending.set(href, img)
    img.onload = () => pending.delete(href)
    img.onerror = () => pending.delete(href)
    img.src = href
  }

  const listenerOpts = { passive: true, capture: true } as const
  document.addEventListener('pointerover', trigger, listenerOpts)
  document.addEventListener('pointerdown', trigger, listenerOpts)
  return () => {
    document.removeEventListener('pointerover', trigger, listenerOpts)
    document.removeEventListener('pointerdown', trigger, listenerOpts)
    pending.clear()
  }
}
