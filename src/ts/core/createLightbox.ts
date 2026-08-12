import { buildGalleries, neighborGallery } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { CANDIDATE_SELECTOR } from '../constants'
import { registerContent } from '../content/registerContent'
import { attachExploreMode } from '../interaction/exploreMode'
import { attachZoomCursor } from '../interaction/zoomCursor'
import { attachZoomMode } from '../interaction/zoomMode'
import type { IGallery, ILightbox, ILightboxApi, IOpenRequest, IOptions } from '../interfaces'
import { attachOpenTransition } from '../transition/transitionEngine'
import type { TDeepPartial } from '../types'
import { registerUi } from '../ui/registerUi'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'
import { createPswp } from './pswpFactory'

/** Composition root: delegated click handling, open path, close routing, nav. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let clickHandler: ((e: MouseEvent) => void) | null = null
  let keyHandler: ((e: KeyboardEvent) => void) | null = null
  let current: { req: IOpenRequest; galleries: IGallery[] } | null = null

  const close = (): void => {
    void engineState.closeHandle?.close()
  }

  const openRequest = (
    req: IOpenRequest,
    galleries: IGallery[],
    instant: boolean,
    point?: { x: number; y: number }
  ): void => {
    current = { req, galleries }
    createPswp(opts, req, (pswp) => {
      engineState.closeHandle = attachOpenTransition(pswp, opts, req, instant)
      const explore = attachExploreMode(pswp, opts, point)
      // With explore active, the click zoom toggle runs aimed at the live
      // mouse (one continuous writer) instead of PhotoSwipe's tap-point zoom.
      if (explore && opts.zoom.imageClickAction === 'zoom') {
        pswp.options.imageClickAction = () => {
          explore.toggleZoomAimed()
        }
      }
      attachZoomCursor(pswp)
      attachZoomMode(pswp, opts)
      registerContent(pswp)
      registerUi(pswp, req.gallery, opts, api)
      // Clicking the backdrop closes through OUR choreography, not
      // PhotoSwipe's instant close (its opener is disabled).
      pswp.options.bgClickAction = () => {
        close()
      }
      pswp.on('destroy', () => {
        if (current?.req === req) {
          current = null
        }
      })
    })
  }

  /** Nav with pass-through: at a gallery boundary, jump to the neighbor. */
  const nav = (dir: 1 | -1): void => {
    const pswp = engineState.pswp
    if (!pswp || !current) {
      return
    }
    const { req, galleries } = current
    const lastIndex = req.gallery.slides.length - 1
    const atBoundary = dir === 1 ? pswp.currIndex >= lastIndex : pswp.currIndex <= 0
    if (opts.gallery.passThrough && atBoundary) {
      const neighbor = neighborGallery(req.gallery, galleries, dir)
      const index = dir === 1 ? 0 : (neighbor?.slides.length ?? 1) - 1
      const key = neighbor?.slides[index]?.key
      const sourceElement = key ? neighbor?.elementsByKey.get(key)?.[0] : undefined
      if (neighbor && sourceElement) {
        // Instant swap: the backdrop stays visually continuous — the old core
        // is destroyed without choreography and the neighbor opens fully up.
        pswp.destroy()
        openRequest({ gallery: neighbor, index, sourceElement }, galleries, true)
        return
      }
    }
    // pswp.next()/goTo() hard-cut (upstream #2175) — the animated path is the
    // main scroll's own spring, the same one drag gestures use.
    pswp.mainScroll.moveIndexBy(dir, true)
  }

  const api: ILightboxApi = {
    close,
    next: () => {
      nav(1)
    },
    prev: () => {
      nav(-1)
    },
    goTo: (index) => {
      const pswp = engineState.pswp
      if (pswp) {
        pswp.mainScroll.moveIndexBy(index - pswp.currIndex, true)
      }
    }
  }

  const open = (el: HTMLElement, point?: { x: number; y: number }): boolean => {
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
    openRequest(req, galleries, false, point)
    return true
  }

  return {
    init: () => {
      if (clickHandler) {
        return
      }
      clickHandler = (e: MouseEvent) => {
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
        open(el, { x: e.clientX, y: e.clientY })
      }
      keyHandler = (e: KeyboardEvent) => {
        if (!engineState.pswp) {
          return
        }
        // Esc and arrows are ours: PhotoSwipe's own paths would bypass the
        // close choreography and pass-through navigation.
        if (e.key === 'Escape') {
          e.preventDefault()
          close()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          api.next()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          api.prev()
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
