import { TRANSITIONING_CLASS } from '../constants'
import type { ITransitionContext } from '../interfaces'
import { createBackdrop } from './backdrop'
import { setChrome } from './setChrome'

/**
 * First paint: the backdrop exists and the chrome starts hidden, ready for
 * the open choreography to raise both on one clock.
 */
export function mountChrome(ctx: ITransitionContext): void {
  const { pswp } = ctx
  if (!pswp.element) {
    return
  }
  setChrome(pswp.element, 0)
  ctx.backdrop.current = createBackdrop(pswp.element, ctx.opts)
  pswp.element.classList.add(TRANSITIONING_CLASS)
}
