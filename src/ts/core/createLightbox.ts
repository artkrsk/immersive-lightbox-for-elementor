import { buildGalleries } from '../collector/buildGalleries'
import { resolveOpenRequest } from '../collector/resolveOpenRequest'
import { registerContent } from '../content/registerContent'
import { attachExploreMode } from '../interaction/exploreMode'
import { attachHoverPrefetch } from '../interaction/hoverPrefetch'
import { attachWheelNav } from '../interaction/wheelNav'
import { attachZoomCursor } from '../interaction/zoomCursor'
import { attachZoomMode } from '../interaction/zoomMode'
import type { IGallery, ILightbox, ILightboxApi, IOpenRequest, IOptions } from '../interfaces'
import { attachOpenTransition } from '../transition/transitionEngine'
import type { TDeepPartial } from '../types'
import { registerUi } from '../ui/registerUi'
import { audioFocus } from '../video/audioFocus'
import { resolveVideoSource } from '../video/resolveVideoSource'
import { attachDelegation } from './attachDelegation'
import { createNavigator } from './createNavigator'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'
import { createPswp } from './pswpFactory'

/** Composition root: delegated input, open path, close routing, navigation. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let detachDelegation: (() => void) | null = null
  let disposePrefetch: (() => void) | null = null
  let current: { req: IOpenRequest; galleries: IGallery[] } | null = null

  const close = (): void => {
    // Sound never survives into the close choreography.
    audioFocus.releaseAll()
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
      attachZoomCursor(pswp)
      // Before explore: its change-listener centers arriving slides, and
      // explore's pointer-aim (registered after) must win over that.
      attachZoomMode(pswp, opts)
      const explore = attachExploreMode(pswp, opts, point)
      // With explore active, the click zoom toggle runs aimed at the live
      // mouse (one continuous writer) instead of PhotoSwipe's tap-point zoom.
      if (explore && opts.zoom.imageClickAction === 'zoom') {
        pswp.options.imageClickAction = () => {
          explore.toggleZoomAimed()
        }
      }
      attachWheelNav(pswp, opts)
      const media = registerContent(pswp, opts, req.index)
      registerUi(pswp, req.gallery, opts, api, media)
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

  const navigator = createNavigator({
    opts,
    getCurrent: () => current,
    openInstant: (req, galleries) => {
      openRequest(req, galleries, true)
    }
  })

  const api: ILightboxApi = {
    close,
    next: () => {
      navigator.nav(1)
    },
    prev: () => {
      navigator.nav(-1)
    },
    goTo: navigator.goTo
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
    resolveVideoSource(req.gallery.slides[req.index], req.sourceElement)
    openRequest(req, galleries, false, point)
    return true
  }

  return {
    init: () => {
      if (detachDelegation) {
        return
      }
      detachDelegation = attachDelegation({
        open,
        close,
        next: api.next,
        prev: api.prev
      })
      disposePrefetch = attachHoverPrefetch(opts)
    },
    destroy: () => {
      detachDelegation?.()
      detachDelegation = null
      disposePrefetch?.()
      disposePrefetch = null
      engineState.pswp?.destroy()
    },
    open,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__
  }
}
