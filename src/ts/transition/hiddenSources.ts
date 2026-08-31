import type { IOpenRequest } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

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
): {
  hide(el: HTMLElement): void
  hideAfterFrames(el: HTMLElement, frames: number): void
} {
  const hidden = new Set<HTMLElement>()
  let live = true

  const hide = (el: HTMLElement): void => {
    el.style.visibility = 'hidden'
    hidden.add(el)
  }

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
      if (!instances.includes(el)) {
        el.style.visibility = ''
        hidden.delete(el)
      }
    }
  })

  return {
    hide,
    /**
     * The same hide, held for `frames` presented frames — for a caller whose
     * stand-in cannot paint yet and needs the original to cover for it until
     * it can. A session that ends first drops the pending hide rather than
     * stranding the element mid-restore.
     */
    hideAfterFrames: (el, frames) => {
      const step = (left: number): void => {
        if (!live) {
          return
        }
        if (left <= 0) {
          hide(el)
          return
        }
        requestAnimationFrame(() => {
          step(left - 1)
        })
      }
      step(frames)
    }
  }
}
