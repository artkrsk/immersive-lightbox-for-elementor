import { TRANSITIONING_CLASS } from '../constants'
import type { ITransitionContext } from '../interfaces'
import { createBackdrop } from './backdrop'
import { setChrome } from './setChrome'

/**
 * First paint: the backdrop exists and the chrome starts hidden, ready for
 * the open choreography to raise both on one clock. An instant open — the
 * pass-through gallery swap — lands fully open instead: the backdrop is
 * already up from the outgoing gallery, so there is nothing to choreograph
 * and nothing to mark as transitioning.
 */
export function mountChrome(ctx: ITransitionContext, instant: boolean): void {
  const { pswp } = ctx
  if (!pswp.element) {
    return
  }
  setChrome(pswp.element, instant ? 1 : 0)
  ctx.backdrop.current = createBackdrop(pswp.element, ctx.opts)
  if (instant) {
    ctx.backdrop.current.paint(1, false)
  } else {
    pswp.element.classList.add(TRANSITIONING_CLASS)
  }
}
