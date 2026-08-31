import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const PRESSING_CLASS = 'arts-lightbox-pressing'
const DRAGGABLE_CLASS = 'arts-lightbox-draggable'

/**
 * Marks the root while a pointer is held down on the lightbox, so the native
 * cursor can say "grabbing" for the duration.
 *
 * The fork stamps no dragging state of its own — only `pswp--has_mouse` — but
 * it does announce `pointerDown` / `pointerUp` around every gesture, which is
 * the same span a grab cursor wants. Deliberately a press, not a drag: native
 * grab cursors switch on the button, not after a travel threshold, and a
 * press that turns out to be a click reads as a grab that let go.
 *
 * The cursor vocabulary this completes lives in `_lightbox.scss`; with a
 * cursor follower on the page its `hideNativeCursor` blanks all of it.
 */
export function attachDragCursor(pswp: PhotoSwipe, opts: IOptions): void {
  // A grab cursor promises somewhere to drag TO. One slide, or desktop drag
  // turned off, and the promise is false — so the whole vocabulary is gated
  // on this rather than on the press alone.
  //
  // On afterInit, not now: interactions attach between construction and
  // init, when the root element does not exist yet.
  pswp.on('afterInit', () => {
    pswp.element?.classList.toggle(DRAGGABLE_CLASS, opts.desktopDrag && pswp.getNumItems() > 1)
  })

  const set = (pressing: boolean): void => {
    pswp.element?.classList.toggle(PRESSING_CLASS, pressing)
  }

  pswp.on('pointerDown', () => {
    set(true)
  })
  pswp.on('pointerUp', () => {
    set(false)
  })
  // A pointer captured elsewhere never reports its release, and the close
  // choreography can outlive the gesture that started it.
  pswp.on('destroy', () => {
    set(false)
  })
}
