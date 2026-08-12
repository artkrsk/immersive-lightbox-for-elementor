import type { IOpenRequest } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

/**
 * Tracks page elements hidden while their flight clone flies — otherwise
 * the "cloning" is visible (the original still sitting on the page).
 *
 * Everything restores on destroy, whatever path led there. Navigating away
 * from a slide restores its hidden source right away — the backdrop is
 * fully opaque mid-session, so the restore is invisible; without it,
 * closing from another slide reveals a hole where the originally-clicked
 * element still sat hidden.
 */
export function createHiddenSources(
  pswp: PhotoSwipe,
  req: IOpenRequest
): { hide(el: HTMLElement): void } {
  const hidden = new Set<HTMLElement>()

  pswp.on('destroy', () => {
    for (const el of hidden) {
      el.style.visibility = ''
    }
    hidden.clear()
  })

  pswp.on('change', () => {
    const key = req.gallery.slides[pswp.currIndex]?.key
    const instances = key ? (req.gallery.elementsByKey.get(key) ?? []) : []
    for (const el of hidden) {
      if (!instances.includes(el)) {
        el.style.visibility = ''
        hidden.delete(el)
      }
    }
  })

  return {
    hide: (el) => {
      el.style.visibility = 'hidden'
      hidden.add(el)
    }
  }
}
