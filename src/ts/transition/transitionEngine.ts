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
  req: IOpenRequest
): ITransitionHandle {
  let transitioning = true
  let closePromise: Promise<void> | null = null
  let openSettled: () => void
  // What a close arriving mid-open waits for. The two choreographies share one
  // flight layer and one clock, so they cannot run together — but the request
  // can no longer be dropped either: a page transition asking the lightbox to
  // go away is not answerable with "not now".
  const opened = new Promise<void>((resolve) => {
    openSettled = resolve
  })

  const ctx = createTransitionContext(pswp, opts, req)

  pswp.on('firstUpdate', () => {
    mountChrome(ctx)
  })

  pswp.on('afterInit', () => {
    runOpenChoreography(ctx, () => {
      transitioning = false
      openSettled()
    })
  })

  // Repeated calls join the close already running — a consumer awaiting the
  // second one still learns when the lightbox is actually gone.
  const close = (): Promise<void> => {
    closePromise ??= transitioning
      ? opened.then(() => runCloseChoreography(ctx))
      : // Started synchronously when there is nothing to wait for, so the
        // close button and Esc keep the timing they always had.
        runCloseChoreography(ctx)
    return closePromise
  }

  return {
    close,
    isTransitioning: () => transitioning || closePromise !== null
  }
}
