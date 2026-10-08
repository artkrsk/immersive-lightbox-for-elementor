import { claimCandidateClick } from '../collector/claimCandidateClick'
import { pointerTravel } from '../collector/pointerTravel'
import { isRTLDocument } from '../utils/isRTLDocument'
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
  const releasePointer = pointerTravel.observe()

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
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      // Navigation follows reading order, matching our mirrored arrow
      // controls. The fork's zoomed-slide pan path remains physical.
      const forward = e.key === 'ArrowRight'
      if (isRTLDocument() ? !forward : forward) {
        handlers.next()
      } else {
        handlers.prev()
      }
    }
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
  return () => {
    releasePointer()
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
  }
}
