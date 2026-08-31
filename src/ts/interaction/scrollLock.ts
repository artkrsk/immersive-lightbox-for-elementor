/**
 * Locks page scroll for the lightbox's lifetime — wheel over the overlay
 * must not move the page behind it. Touch inside the lightbox is already
 * claimed by the gesture layer's preventDefault; this covers native desktop
 * scrolling. The vanished scrollbar's width is compensated as root padding
 * so the page doesn't shift under the opening transition.
 *
 * Returns the restore; values are put back exactly as found.
 */
export function lockPageScroll(): () => void {
  const html = document.documentElement
  const body = document.body
  const scrollbar = window.innerWidth - html.clientWidth
  const prevHtmlOverflow = html.style.overflow
  const prevBodyOverflow = body.style.overflow
  const prevPadding = html.style.paddingRight
  // The root's value is the one that propagates to the viewport, so the html
  // rule alone stops scrolling. The body gets `clip` rather than `hidden`
  // purely defensively: `hidden` would make the body a scroll container, and
  // a descendant ViewTimeline source or sticky scrollport would re-parent
  // onto the full-height body box (scroll-driven reveals snap to their end
  // state). `clip` clips identically and never becomes a scroll container.
  html.style.overflow = 'hidden'
  body.style.overflow = 'clip'
  if (scrollbar > 0) {
    html.style.paddingRight = `${scrollbar}px`
  }
  return () => {
    html.style.overflow = prevHtmlOverflow
    body.style.overflow = prevBodyOverflow
    html.style.paddingRight = prevPadding
  }
}
