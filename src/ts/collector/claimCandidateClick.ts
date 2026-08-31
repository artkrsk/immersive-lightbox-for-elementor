import { matchCandidateElement } from './matchCandidateElement'
import { pointerTravel } from './pointerTravel'

/**
 * The one way a click becomes OURS — shared by the gate and the engine's
 * delegation so the two can never disagree about the same click.
 *
 * Modifier clicks keep their native meaning (new tab etc.). No back-off on
 * `defaultPrevented`: candidates are explicit opt-in markup, and SPA/router
 * layers preventDefault href="#" links in window-capture before we ever see
 * the event. A claim prevents AND stops propagation — Elementor's native
 * lightbox delegates in bubble phase on the same document, and letting the
 * event through would open both lightboxes over each other.
 */
export function claimCandidateClick(
  e: MouseEvent,
  nativeFallback: boolean
): { el: HTMLElement; point: { x: number; y: number } } | null {
  // Consumed for EVERY click, before any early return, so a press's verdict
  // can never go stale and leak onto a later (keyboard) click.
  const dragged = pointerTravel.consumeClick(e)
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null
  }
  const el = matchCandidateElement(e.target as Element | null, nativeFallback)
  if (!el) {
    return null
  }
  // A matched click is consumed either way: claimed as an open, or — when
  // it's the tail end of a drag — swallowed. Declining instead would hand it
  // to Elementor's bubble delegation (native lightbox) or plain navigation,
  // because the dragger's own capture-phase click killer sits on its own
  // element and fires only after us.
  e.preventDefault()
  e.stopPropagation()
  if (dragged) {
    return null
  }
  return { el, point: { x: e.clientX, y: e.clientY } }
}
