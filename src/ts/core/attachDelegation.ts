import { claimCandidateClick } from '../collector/claimCandidateClick'
import { pointerTravel } from '../collector/pointerTravel'
import { engineState } from './engineState'

/**
 * Document-level input delegation: candidate clicks open, Esc/arrows close
 * and navigate through OUR paths (PhotoSwipe's own would bypass the close
 * choreography). Returns the detach.
 */
export function attachDelegation(
  handlers: {
    open(el: HTMLElement, point: { x: number; y: number }): void
    close(): void
    next(): void
    prev(): void
  },
  nativeFallback = false
): () => void {
  // The claim's drag-vs-click verdict needs press travel to already be
  // tracked when the click arrives. Deliberately not detached below: it's an
  // idempotent page-lifetime observer, and the gate bundle arms its own.
  pointerTravel.observe()

  const onClick = (e: MouseEvent): void => {
    const claim = claimCandidateClick(e, nativeFallback)
    if (claim) {
      handlers.open(claim.el, claim.point)
    }
  }

  const onKey = (e: KeyboardEvent): void => {
    if (!engineState.pswp) {
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handlers.close()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      handlers.next()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      handlers.prev()
    }
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
  }
}
