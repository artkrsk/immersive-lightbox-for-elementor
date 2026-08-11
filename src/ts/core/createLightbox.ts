import { buildGalleries } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { CANDIDATE_SELECTOR } from '../constants'
import type { ILightbox, IOptions } from '../interfaces'
import type { TDeepPartial } from '../types'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'
import { createPswp } from './pswpFactory'

/** Composition root: delegated click handling + the open path. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let clickHandler: ((e: MouseEvent) => void) | null = null

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
    createPswp(opts, req)
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
      document.addEventListener('click', clickHandler, true)
    },
    destroy: () => {
      if (clickHandler) {
        document.removeEventListener('click', clickHandler, true)
        clickHandler = null
      }
      engineState.pswp?.destroy()
    },
    open,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__
  }
}
