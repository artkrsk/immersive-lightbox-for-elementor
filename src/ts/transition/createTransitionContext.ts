import type { IFlightSource, IOpenRequest, IOptions, ITransitionContext } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { captureFlightSource } from './captureFlightSource'
import { createFlightLayer } from './flightLayer'
import { createHiddenSources } from './hiddenSources'

/** Captured synchronously at click time, before any layout work. Videos fly
 *  too: adopted ones as the LIVE element, others via their poster. */
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
 * The surface both choreographies read and write. Building it captures the
 * click-time source geometry, so it must run before any layout work — the
 * page has not moved yet at this point.
 */
export function createTransitionContext(
  pswp: PhotoSwipe,
  opts: IOptions,
  req: IOpenRequest
): ITransitionContext {
  return {
    pswp,
    opts,
    req,
    // Resolved at mount: the root does not exist yet. Body is the fallback for
    // the window before init, where a flight should never start anyway.
    flight: createFlightLayer(() => pswp.element ?? document.body),
    backdrop: { current: null },
    hidden: createHiddenSources(pswp, req),
    openSource: captureOpenSource(req),
    adopted: req.gallery.slides[req.index]?.adopted ?? null
  }
}
