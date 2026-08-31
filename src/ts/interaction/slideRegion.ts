import type PhotoSwipe from '../photoswipe/photoswipe'

const OVER_IMAGE_CLASS = 'arts-lightbox-over-image'

/**
 * Which part of the slide area the pointer is over, mirrored onto <html>.
 *
 * The two regions do different things: a click on the image zooms it (where
 * it can), a click on the space beside it closes the lightbox. A cursor
 * follower draws its glyph in its OWN element, so it cannot ask where the
 * pointer is relative to our slide — the answer has to reach it as state,
 * which is also what keeps one pair of bars morphing between plus, minus and
 * cross instead of having its markup swapped underneath.
 *
 * Delegated `pointerover`: it fires when the element under the pointer
 * changes, which is exactly when the answer can change, and never per frame.
 */
export function attachSlideRegion(pswp: PhotoSwipe): void {
  const set = (over: boolean): void => {
    document.documentElement.classList.toggle(OVER_IMAGE_CLASS, over)
  }

  pswp.on('afterInit', () => {
    pswp.element?.addEventListener('pointerover', (e) => {
      const target = e.target as Element | null
      set(Boolean(target?.closest('.pswp__img')))
    })
  })

  // <html> outlives the root, and the pointer is over nothing of ours now.
  pswp.on('destroy', () => {
    set(false)
  })
}
