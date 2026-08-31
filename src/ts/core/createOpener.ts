import { buildGalleries } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { registerContent } from '../content/registerContent'
import { lockPageScroll } from '../interaction/scrollLock'
import type { ILightboxApi, IOpenRequest, IOptions } from '../interfaces'
import { attachOpenTransition } from '../transition/transitionEngine'
import { registerUi } from '../ui/registerUi'
import { measureAdminBarOffset } from '../utils/measureAdminBarOffset'
import { attachInteractions } from './attachInteractions'
import { attachLightboxEvents } from './attachLightboxEvents'
import { engineState } from './engineState'
import { holdHeader, releaseHeader } from './headerHold'
import { createPswp } from './pswpFactory'

/**
 * The open path: resolve a clicked element to a gallery request, build a
 * fresh pswp core, and hang every subsystem off it.
 */
export function createOpener(deps: {
  opts: IOptions
  /** The navigation surface handed on to the UI layer. */
  api: ILightboxApi
  /** Routed through the engine api so the close choreography applies. */
  close(): void
  /**
   * The core factory. Overridable so the wiring below can be exercised
   * against a stand-in — `createPswp` constructs the real fork and calls
   * `init()`, which is a whole lightbox booting for the sake of asserting
   * that a handler got registered.
   */
  createPswp?: typeof createPswp
}): {
  open(el: HTMLElement, point?: { x: number; y: number }): boolean
} {
  const { opts } = deps
  const makePswp = deps.createPswp ?? createPswp

  const openRequest = (req: IOpenRequest, point?: { x: number; y: number }): void => {
    makePswp(opts, req, (pswp) => {
      // Before the transition wiring, so open reaches themes with the root in
      // the DOM and the chrome mounted but the clock still at 0.
      attachLightboxEvents(pswp, req.gallery)
      engineState.closeHandle = attachOpenTransition(pswp, opts, req)
      attachInteractions(pswp, opts, point)
      registerContent(pswp, opts, req.index)
      registerUi(pswp, req.gallery, opts, deps.api)
      // The page behind the lightbox holds still: native scroll locked with
      // scrollbar compensation, and the Lenis-family contract stamped so
      // smooth-scroll libraries release the overlay too.
      let unlock: (() => void) | null = null
      // Chrome slides below the admin bar by its measured overlap (the
      // slide area follows via paddingFn). Scroll is locked while open, so
      // the value only moves on resize.
      const stampAdminBar = (): void => {
        pswp.element?.style.setProperty('--arts-lightbox-admin-bar', `${measureAdminBarOffset()}px`)
      }
      pswp.on('firstUpdate', () => {
        unlock = lockPageScroll()
        pswp.element?.setAttribute('data-lenis-prevent', '')
        if (pswp.element) {
          holdHeader(pswp.element)
        }
        stampAdminBar()
      })
      pswp.on('resize', stampAdminBar)
      // On `close`, not `destroy`: the fork defers teardown a beat, and the
      // header only hears a release that happens while the root is attached.
      // Invisible either way — `.pswp` sits at `--pswp-root-z-index` (100000,
      // or 99997 under the admin bar), so the bar coming back during the close
      // choreography is behind it.
      pswp.on('close', () => {
        if (pswp.element) {
          releaseHeader(pswp.element)
        }
      })
      pswp.on('destroy', () => {
        unlock?.()
        unlock = null
        // A direct destroy() — the engine's own teardown — never fires
        // `close`, so the hold would outlive the lightbox by a scroll.
        if (pswp.element) {
          releaseHeader(pswp.element)
        }
      })
      // Clicking the backdrop closes through OUR choreography, not
      // PhotoSwipe's instant close (its opener is disabled).
      pswp.options.bgClickAction = () => {
        deps.close()
      }
    })
  }

  return {
    open: (el, point) => {
      if (engineState.pswp) {
        return false
      }
      // Galleries are rebuilt per open: the collector is cheap at page scale
      // and a fresh pass is inherently correct against AJAX/infinite-list DOM.
      const galleries = buildGalleries(document, opts.gallery, opts.elementor.nativeFallback)
      const req = resolveOpenRequest(el, galleries)
      if (!req) {
        return false
      }
      openRequest(req, point)
      return true
    }
  }
}
