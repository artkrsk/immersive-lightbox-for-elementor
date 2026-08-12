import { TRANSITIONING_CLASS } from '../constants'
import type {
  IFlightSource,
  IOpenRequest,
  IOptions,
  ITransitionContext,
  ITransitionHandle
} from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { createBackdrop } from './backdrop'
import { captureFlightSource } from './captureFlightSource'
import { runCloseChoreography } from './closeChoreography'
import { createFlightLayer } from './flightLayer'
import { createHiddenSources } from './hiddenSources'
import { runOpenChoreography } from './openChoreography'
import { setChrome } from './setChrome'

/** Captured synchronously at click time, before any layout work. Videos
 *  fly too: adopted ones as the LIVE element, others via their poster. */
function captureOpenSource(req: IOpenRequest): IFlightSource {
  const openSlide = req.gallery.slides[req.index]
  if (openSlide?.type === 'image' || openSlide?.type === 'video') {
    return captureFlightSource(req.sourceElement)
  }
  return {
    rect: { x: 0, y: 0, w: 0, h: 0 },
    radius: 0,
    innerHeightPct: 100,
    innerOffsetYPct: 0,
    src: ''
  }
}

/**
 * Wires the open choreography onto a freshly constructed (not yet inited)
 * pswp core and returns the handle that owns the matching close. One clock
 * drives everything — the choreographies live in their own modules; this
 * is the event wiring and the shared context.
 */
export function attachOpenTransition(
  pswp: PhotoSwipe,
  opts: IOptions,
  req: IOpenRequest,
  instant = false
): ITransitionHandle {
  let transitioning = !instant
  let closing = false

  const ctx: ITransitionContext = {
    pswp,
    opts,
    req,
    flight: createFlightLayer(),
    backdrop: { current: null },
    hidden: createHiddenSources(pswp, req),
    openSource: captureOpenSource(req),
    adopted: req.gallery.slides[req.index]?.adopted ?? null
  }

  pswp.on('firstUpdate', () => {
    if (pswp.element) {
      setChrome(pswp.element, instant ? 1 : 0)
      ctx.backdrop.current = createBackdrop(pswp.element, opts)
      if (instant) {
        // Pass-through gallery swap: the backdrop is already up — land
        // fully open with no choreography.
        ctx.backdrop.current.paint(1, false)
      } else {
        pswp.element.classList.add(TRANSITIONING_CLASS)
      }
    }
  })

  // Whatever path led to destroy, an adopted video ALWAYS goes home
  // (idempotent — the choreographed close already returned it).
  pswp.on('destroy', () => {
    ctx.adopted?.return()
  })

  pswp.on('afterInit', () => {
    if (instant) {
      return
    }
    runOpenChoreography(ctx, () => {
      transitioning = false
    })
  })

  const close = (): Promise<void> => {
    if (closing || transitioning) {
      return Promise.resolve()
    }
    closing = true
    return runCloseChoreography(ctx)
  }

  return {
    close,
    isTransitioning: () => transitioning || closing
  }
}
