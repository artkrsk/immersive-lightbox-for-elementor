import type { IOpenRequest } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * Tracks page elements hidden while a flight stands in for them. The OPEN
 * hides nothing until it settles: the flight launches on the source rect and
 * only grows, so the original is covered for every frame of the open — and a
 * clone whose tiles are not painted yet shows the original through it instead
 * of a hole. The hide lands under an opaque backdrop, where it is invisible,
 * and what it buys is the close: a return flight that lands on an element
 * nothing else paints.
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
): {
  hide(el: HTMLElement): void
} {
  const hidden = new Set<HTMLElement>()
  let live = true

  pswp.on('destroy', () => {
    live = false
    for (const el of hidden) {
      el.style.visibility = ''
    }
    hidden.clear()
  })

  pswp.on('change', () => {
    const key = req.gallery.slides[pswp.currIndex]?.key
    const instances = key ? (req.gallery.elementsByKey.get(key) ?? []) : []
    for (const el of hidden) {
      // A hidden box may sit inside its instance (a card's image frame).
      if (!instances.some((instance) => instance.contains(el))) {
        el.style.visibility = ''
        hidden.delete(el)
      }
    }
  })

  return {
    /**
     * A session that already ended ignores the hide rather than stranding
     * the element invisible: the open's clock can outlive a destroy.
     */
    hide: (el) => {
      if (!live) {
        return
      }
      el.style.visibility = 'hidden'
      hidden.add(el)
    }
  }
}
