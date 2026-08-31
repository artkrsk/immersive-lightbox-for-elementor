import { EVENT_CHANGE, EVENT_DESTROY, EVENT_OPEN } from '../constants/eventNames'
import type { IGallery, ILightboxChangeDetail, ILightboxEventDetail } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * The notification side of the theme contract: three CustomEvents on
 * `document`, so a theme can drive its own chrome without registering
 * anything with the engine.
 *
 * Attached per pswp core, so a theme's instances are always scoped to the
 * root they were announced with. There is no close event — destroy doubles as
 * it ("core torn down, release your instances"), and the close choreography
 * already lowers --arts-lightbox-chrome, so a CSS exit needs no notification.
 *
 * The change notification rides the fork's `potentialIndexChange` — the
 * commit, when the destination is decided — not pswp `change`, which only
 * follows once the main-scroll spring settles. Same reason the stock
 * arrows/caption/thumbnails read `potentialIndex` (ui/slidePosition.ts): a
 * committed navigation is never undone, so chrome can move with the slide.
 *
 * The destroy notification rides pswp `close`, not pswp `destroy`: the fork's
 * destroy() defers actual teardown a beat. `close` is the synchronous intent,
 * every close in this engine leads to destroy (its own close triggers are
 * disabled), and the root is still queryable at that moment.
 */
export function attachLightboxEvents(pswp: PhotoSwipe, gallery: IGallery): void {
  // -1 doubles as "open not yet emitted": nothing goes out before open.
  let lastIndex = -1

  const detail = (root: HTMLElement, index: number): ILightboxEventDetail => {
    const slide = gallery.slides[index]
    return {
      root,
      index,
      total: gallery.slides.length,
      caption: slide?.caption ?? '',
      description: slide?.description ?? '',
      type: slide?.type ?? 'image'
    }
  }

  pswp.on('afterInit', () => {
    if (!pswp.element) {
      return
    }
    lastIndex = pswp.currIndex
    document.dispatchEvent(
      new CustomEvent(EVENT_OPEN, { detail: detail(pswp.element, pswp.currIndex) })
    )
  })

  pswp.on('potentialIndexChange', (e) => {
    const index = pswp.potentialIndex
    if (lastIndex === -1 || index === lastIndex || !pswp.element) {
      return
    }
    const changeDetail: ILightboxChangeDetail = {
      ...detail(pswp.element, index),
      previousIndex: lastIndex,
      direction: e.direction
    }
    lastIndex = index
    document.dispatchEvent(new CustomEvent(EVENT_CHANGE, { detail: changeDetail }))
  })

  pswp.on('close', () => {
    if (lastIndex === -1 || !pswp.element) {
      return
    }
    // Back to "not announced": the trailing pswp `destroy` (and any repeated
    // close call) has nothing left to say for this core.
    lastIndex = -1
    document.dispatchEvent(new CustomEvent(EVENT_DESTROY, { detail: { root: pswp.element } }))
  })
}
