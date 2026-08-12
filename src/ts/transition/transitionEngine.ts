import type { IOpenRequest, IOptions, ITransitionHandle } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { runCloseChoreography } from './closeChoreography'
import { createTransitionContext } from './createTransitionContext'
import { mountChrome } from './mountChrome'
import { runOpenChoreography } from './openChoreography'

/**
 * Wires the open choreography onto a freshly constructed (not yet inited)
 * pswp core and returns the handle that owns the matching close. One clock
 * drives everything — the choreographies live in their own modules; this is
 * the event wiring and the transitioning/closing guards.
 */
export function attachOpenTransition(
  pswp: PhotoSwipe,
  opts: IOptions,
  req: IOpenRequest,
  instant = false
): ITransitionHandle {
  let transitioning = !instant
  let closing = false

  const ctx = createTransitionContext(pswp, opts, req)

  pswp.on('firstUpdate', () => {
    mountChrome(ctx, instant)
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
