import { buildGalleries } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { CANDIDATE_SELECTOR } from '../constants'
import { attachExploreMode } from '../interaction/exploreMode'
import type { ILightbox, IOptions } from '../interfaces'
import { attachOpenTransition } from '../transition/transitionEngine'
import type { TDeepPartial } from '../types'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'
import { createPswp } from './pswpFactory'

/** Composition root: delegated click handling, open path, close routing. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let clickHandler: ((e: MouseEvent) => void) | null = null
  let keyHandler: ((e: KeyboardEvent) => void) | null = null

  const close = (): void => {
    void engineState.closeHandle?.close()
  }

  const open = (el: HTMLElement): boolean => {
    if (engineState.pswp) {
      return false
    }
    // Galleries are rebuilt per open: the collector is cheap at page scale
    // and a fresh pass is inherently correct against AJAX/infinite-list DOM.
    const galleries = buildGalleries(document, opts.gallery)
    const req = resolveOpenRequest(el, galleries)
    if (!req) {
      return false
    }
    createPswp(opts, req, (pswp) => {
      engineState.closeHandle = attachOpenTransition(pswp, opts, req)
      attachExploreMode(pswp, opts)
      // Clicking the backdrop closes through OUR choreography, not
      // PhotoSwipe's instant close (its opener is disabled).
      pswp.options.bgClickAction = () => {
        close()
      }
    })
    return true
  }

  return {
    init: () => {
      if (clickHandler) {
        return
      }
      clickHandler = (e: MouseEvent) => {
        // Modifier clicks keep their native meaning (new tab etc.).
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          return
        }
        const el = (e.target as Element | null)?.closest<HTMLElement>(CANDIDATE_SELECTOR)
        if (!el) {
          return
        }
        e.preventDefault()
        open(el)
      }
      keyHandler = (e: KeyboardEvent) => {
        // Esc is ours: PhotoSwipe's own escKey path would close instantly,
        // bypassing the curtain.
        if (e.key === 'Escape' && engineState.pswp) {
          e.preventDefault()
          close()
        }
      }
      document.addEventListener('click', clickHandler, true)
      document.addEventListener('keydown', keyHandler, true)
    },
    destroy: () => {
      if (clickHandler) {
        document.removeEventListener('click', clickHandler, true)
        clickHandler = null
      }
      if (keyHandler) {
        document.removeEventListener('keydown', keyHandler, true)
        keyHandler = null
      }
      engineState.pswp?.destroy()
    },
    open,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__
  }
}
