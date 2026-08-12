import type { IOpenRequest } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

function isOnScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0
}

/**
 * The element the return flight lands on. The element the user actually
 * opened from wins while it still shows the current slide (several clones
 * can be on screen at once — landing on a sibling clone while the original
 * sits hidden reads as closing "to the wrong image"). Fallback: the first
 * on-screen instance of the current slide's key.
 */
export function findCloseSource(pswp: PhotoSwipe, req: IOpenRequest): HTMLElement | null {
  const key = req.gallery.slides[pswp.currIndex]?.key
  if (!key) {
    return null
  }
  const instances = req.gallery.elementsByKey.get(key) ?? []
  const original = req.sourceElement
  if (instances.includes(original) && original.isConnected && isOnScreen(original)) {
    return original
  }
  return instances.find((el) => el.isConnected && isOnScreen(el)) ?? null
}
