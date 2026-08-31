import type PhotoSwipe from '../photoswipe/photoswipe'
import { canSlideZoom } from './canSlideZoom'
import { nudgeCursorFollower } from './nudgeCursorFollower'

const CAN_ZOOM_CLASS = 'arts-lightbox-can-zoom'
const ZOOMED_IN_CLASS = 'arts-lightbox-zoomed-in'
const EPSILON = 0.001

/**
 * Owns the zoom cursor state. PhotoSwipe's own cursor classes require
 * `imageClickAction === 'zoom'` literally (ours is a function) and exact
 * zoom-level equality — both too fragile. We derive from live state:
 * can-zoom = the slide has meaningful zoom range; zoomed-in = ANY level
 * beyond fit. The cursor must promise what the click toggle actually does,
 * and the toggle's out-branch triggers from any level above fit — so the
 * zoom-out cursor shows for the whole zoomed-in range, not just the ceiling.
 *
 * While a zoom is animating the promise comes from its DESTINATION instead.
 * Our aimed toggle drives the level frame by frame on its own clock, and the
 * threshold sits at the fit end, so a live reading flips instantly on the way
 * in and only on the last frame on the way out — the affordance would lag the
 * click it describes, in one direction only.
 */
export function attachZoomCursor(pswp: PhotoSwipe): void {
  /** Destination of a zoom in flight; live readings own the state otherwise. */
  let pending: number | null = null
  /** Last verdict a follower was told about, so it hears only the changes. */
  let claimed: boolean | null = null

  const update = (): void => {
    const slide = pswp.currSlide
    if (!slide || !pswp.element) {
      return
    }
    const { fit } = slide.zoomLevels
    const canZoom = canSlideZoom(slide)
    // The promise expires when the level reaches it: an animation that was
    // interrupted (a pinch mid-flight) must not hold the state hostage.
    if (pending !== null && Math.abs(slide.currZoomLevel - pending) < EPSILON) {
      pending = null
    }
    const level = pending ?? slide.currZoomLevel
    const zoomedIn = typeof fit === 'number' && level > fit + EPSILON
    pswp.element.classList.toggle(CAN_ZOOM_CLASS, canZoom)
    pswp.element.classList.toggle(ZOOMED_IN_CLASS, canZoom && zoomedIn)
    // Mirrored onto <html> for chrome drawn OUTSIDE our root — a cursor
    // follower's glyph lives in its own element beside ours, and its rules
    // resolve only when the pointer crosses into an element, so a payload
    // swap would lag a zoom toggled under a still pointer. Same state on a
    // shared ancestor lets CSS track the swap with no JS in the loop.
    const html = document.documentElement
    html.classList.toggle(CAN_ZOOM_CLASS, canZoom)
    html.classList.toggle(ZOOMED_IN_CLASS, canZoom && zoomedIn)

    // Whether the slide can zoom decides which of a follower's rules matches
    // it — the zoom affordance or the drag hint — and that verdict changes
    // under a still pointer: on a slide change, or when a guessed slide's
    // real dimensions land. The follower resolves rules on crossings only,
    // so it has to be told. The DIRECTION (in vs out) never needs this: the
    // glyph reads that from the classes above, in CSS.
    if (canZoom !== claimed) {
      claimed = canZoom
      nudgeCursorFollower()
    }
  }
  pswp.on('zoomPanUpdate', update)
  // Every zoom path announces where it is going before it moves — our aimed
  // toggle dispatches it, and so does the fork's own zoomTo (pinch, wheel,
  // programmatic). Reading the destination here is what makes the affordance
  // flip on the click rather than on the last frame of the animation.
  pswp.on('beforeZoomTo', (e) => {
    pending = e.destZoomLevel
    update()
  })
  pswp.on('change', () => {
    // A new slide arrives at its own level; an abandoned promise would mute it.
    pending = null
    update()
  })
  pswp.on('afterInit', update)
  // Levels can change while a slide is CURRENT: the natural-dims upgrade
  // recalculates them on load, and for an image smaller than the viewport
  // fit and fill collapse onto the natural cap — the affordance must drop
  // the moment the range does, not at the next pan.
  pswp.on('zoomLevelsUpdate', update)
  // <html> outlives the root: a stale class would style a glyph with no slide.
  pswp.on('destroy', () => {
    document.documentElement.classList.remove(CAN_ZOOM_CLASS, ZOOMED_IN_CLASS)
  })
}
