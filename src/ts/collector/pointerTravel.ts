/** Max-axis px a press may wander before its click reads as a drag — wider
 * than the jitter of an honest click, far tighter than any intentional pull. */
const DRAG_TRAVEL_MAX_PX = 6

let originX = 0
let originY = 0
let travel = 0
let pressed = false
let seen = false
let observing = false

const displacement = (x: number, y: number): number =>
  Math.max(Math.abs(x - originX), Math.abs(y - originY))

const onDown = (e: PointerEvent): void => {
  if (!e.isPrimary) {
    return
  }
  originX = e.clientX
  originY = e.clientY
  travel = 0
  pressed = true
  seen = true
}

const onMove = (e: PointerEvent): void => {
  if (!pressed || !e.isPrimary) {
    return
  }
  // Peak displacement, not the release point: a drag that settles back onto
  // its press point is still a drag.
  travel = Math.max(travel, displacement(e.clientX, e.clientY))
}

const onUp = (e: PointerEvent): void => {
  if (!e.isPrimary) {
    return
  }
  pressed = false
}

// No click follows a cancelled press or a native image ghost-drag — forget
// the press entirely so a later keyboard click cannot inherit its travel.
const onCancel = (e: PointerEvent): void => {
  if (!e.isPrimary) {
    return
  }
  pressed = false
  seen = false
}

const onDragStart = (): void => {
  pressed = false
  seen = false
}

/**
 * Watches how far the primary pointer strays from its press point, so the
 * click claim can tell a click from the tail end of a drag. Every dragger
 * suppresses its own post-drag click at capture phase ON ITS OWN ELEMENT
 * (Swiper's wrapper listener, theme drag adapters alike) — which fires after
 * our document-capture claim, so none of them can protect themselves from
 * us. This is the claim's own, library-agnostic measurement.
 *
 * Pure observer: capture + passive listeners that never preventDefault, held
 * for the page's life (`observe` is idempotent, there is no detach — the
 * gate and the engine are separate bundles, each arming its own instance).
 */
export const pointerTravel = {
  observe(): void {
    if (observing) {
      return
    }
    observing = true
    const opts = { capture: true, passive: true }
    document.addEventListener('pointerdown', onDown, opts)
    document.addEventListener('pointermove', onMove, opts)
    document.addEventListener('pointerup', onUp, opts)
    document.addEventListener('pointercancel', onCancel, opts)
    document.addEventListener('dragstart', onDragStart, opts)
  },
  /** One press feeds at most one click: consuming resets the verdict. */
  consumeClick(e: MouseEvent): boolean {
    if (!seen) {
      return false
    }
    seen = false
    return Math.max(travel, displacement(e.clientX, e.clientY)) > DRAG_TRAVEL_MAX_PX
  }
}
