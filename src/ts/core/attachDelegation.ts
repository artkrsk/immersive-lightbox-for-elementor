import { CANDIDATE_SELECTOR } from '../constants'
import { engineState } from './engineState'

/**
 * Document-level input delegation: candidate clicks open, Esc/arrows close
 * and navigate through OUR paths (PhotoSwipe's own would bypass the close
 * choreography and pass-through navigation). Returns the detach.
 */
export function attachDelegation(handlers: {
  open(el: HTMLElement, point: { x: number; y: number }): void
  close(): void
  next(): void
  prev(): void
}): () => void {
  const onClick = (e: MouseEvent): void => {
    // Modifier clicks keep their native meaning (new tab etc.). We do NOT
    // back off on defaultPrevented: data-arts-lightbox is explicit opt-in
    // markup, and router layers (VitePress, SPA themes) preventDefault
    // href="#" links in window-capture before we ever see the event.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }
    const el = (e.target as Element | null)?.closest<HTMLElement>(CANDIDATE_SELECTOR)
    if (!el) {
      return
    }
    e.preventDefault()
    handlers.open(el, { x: e.clientX, y: e.clientY })
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
