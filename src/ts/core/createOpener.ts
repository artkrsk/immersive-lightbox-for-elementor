import { buildGalleries } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { registerContent } from '../content/registerContent'
import type { IGallery, ILightboxApi, IOpenRequest, IOptions } from '../interfaces'
import { attachOpenTransition } from '../transition/transitionEngine'
import { registerUi } from '../ui/registerUi'
import { resolveVideoSource } from '../video/resolveVideoSource'
import { attachInteractions } from './attachInteractions'
import { engineState } from './engineState'
import { createPswp } from './pswpFactory'

/**
 * The open path: resolve a clicked element to a gallery request, build a
 * fresh pswp core, and hang every subsystem off it. Owns `current` — the
 * gallery/index in view — because this is the only place it changes.
 */
export function createOpener(deps: {
  opts: IOptions
  /** The navigation surface handed on to the UI layer. */
  api: ILightboxApi
  /** Routed through the engine api so the close choreography applies. */
  close(): void
}): {
  getCurrent(): { req: IOpenRequest; galleries: IGallery[] } | null
  /** Pass-through gallery swap: open with no choreography. */
  openInstant(req: IOpenRequest, galleries: IGallery[]): void
  open(el: HTMLElement, point?: { x: number; y: number }): boolean
} {
  const { opts } = deps
  let current: { req: IOpenRequest; galleries: IGallery[] } | null = null

  const openRequest = (
    req: IOpenRequest,
    galleries: IGallery[],
    instant: boolean,
    point?: { x: number; y: number }
  ): void => {
    current = { req, galleries }
    createPswp(opts, req, (pswp) => {
      engineState.closeHandle = attachOpenTransition(pswp, opts, req, instant)
      attachInteractions(pswp, opts, point)
      const media = registerContent(pswp, opts, req.index)
      registerUi(pswp, req.gallery, opts, deps.api, media)
      // Clicking the backdrop closes through OUR choreography, not
      // PhotoSwipe's instant close (its opener is disabled).
      pswp.options.bgClickAction = () => {
        deps.close()
      }
      pswp.on('destroy', () => {
        if (current?.req === req) {
          current = null
        }
      })
    })
  }

  return {
    getCurrent: () => current,
    openInstant: (req, galleries) => {
      openRequest(req, galleries, true)
    },
    open: (el, point) => {
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
      resolveVideoSource(req.gallery.slides[req.index], req.sourceElement)
      openRequest(req, galleries, false, point)
      return true
    }
  }
}
