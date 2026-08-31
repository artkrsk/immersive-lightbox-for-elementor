/**
 * How much faster the coverless fade runs than the clock carrying it. A
 * flight earns its duration by traveling; a fade has nothing to show, and
 * the content is the mass the eye waits on — so it clears by the midpoint
 * and the veil moves against an empty stage.
 */
const CONTENT_FADE_RATE = 2

/**
 * How far the content travels while it fades, in px. Enough that the fade
 * reads as a movement rather than a still dissolve, small enough that it
 * never looks like the slide is being thrown. Positive is DOWN: content
 * rises into place on the open and sinks away on the close.
 */
const CONTENT_LIFT_PX = 20

/**
 * Paints slide content for a transition nothing flies over — the html slide,
 * the video with no poster, the button or text link with no visual to morph.
 *
 * Opacity and offset come off ONE value so they can never drift: fully
 * present means opaque and in place, fully gone means transparent and a lift
 * below. Both therefore finish together at the compressed midpoint rather
 * than one running on invisibly.
 *
 * Still ONE clock: same progress, same easing curve, read over a shortened
 * window. That is why it compresses the RAW progress and re-eases rather
 * than scaling the eased value — scaling bends the curve, this shortens it.
 *
 * Written for the close, which runs the clock forward from present. The open
 * is the same shape reversed, so it passes `1 - raw` and gets a rise-and-fade
 * over the back half: the veil establishes the stage, then the content
 * arrives.
 *
 * The offset goes on `translate`, not `transform`: PhotoSwipe's main scroll
 * owns the container's `transform` (it is what moves between slides), and the
 * individual property composes with it instead of fighting it.
 */
export function paintCoverlessFade(
  el: HTMLElement,
  raw: number,
  ease: (t: number) => number
): void {
  const present = 1 - ease(Math.min(1, raw * CONTENT_FADE_RATE))
  el.style.opacity = String(present)
  el.style.translate = `0 ${((1 - present) * CONTENT_LIFT_PX).toFixed(2)}px`
}
