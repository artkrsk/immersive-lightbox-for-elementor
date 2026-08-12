import { TRANSITIONING_CLASS } from '../constants'
import { EASINGS } from '../core/easings'
import type { IFlightTarget, ITransitionContext } from '../interfaces'
import { createClock } from './clock'
import { computeSlideRect } from './computeSlideRect'
import { interpolateFlight } from './interpolateFlight'
import { setChrome } from './setChrome'
import { currentSlideTarget } from './slideTarget'

/**
 * Adopted video hand-off: flight → slide container, same task, so playback
 * never pauses. Controls appear only inside the lightbox.
 */
function handOffAdopted(ctx: ITransitionContext): void {
  const { adopted, flight, pswp } = ctx
  if (!adopted) {
    return
  }
  const el = flight.extract()
  const container = pswp.currSlide?.content?.element
  if (el && container) {
    container.appendChild(el)
    adopted.element.controls = true
  } else {
    adopted.return()
  }
}

/**
 * The open reveal on the one shared clock: backdrop, flight interpolation
 * and chrome opacity all read the same eased value. The real slide stays
 * hidden (TRANSITIONING_CLASS) until the flight lands exactly on it.
 */
export function runOpenChoreography(ctx: ITransitionContext, onSettled: () => void): void {
  const { pswp, opts, flight, backdrop, hidden, openSource, adopted } = ctx
  const initialTarget = currentSlideTarget(pswp)
  const flies = Boolean(initialTarget && (adopted || openSource.src))
  if (flies && initialTarget) {
    flight.mount(
      interpolateFlight(openSource, initialTarget, 0),
      adopted ? { kind: 'element', el: adopted.take() } : { kind: 'img', src: openSource.src }
    )
    hidden.hide(ctx.req.sourceElement)
  }
  // The landing rect is LIVE: explore mode already pans the (hidden) slide
  // toward the mouse during the transition, so the flight re-reads the
  // slide's actual pan every frame and lands wherever the pointer steered
  // it — no snap at hand-off. Radius is cached; slide rect math is pure.
  const radius = initialTarget?.radius ?? 0
  const liveTarget = (): IFlightTarget | null => {
    const slide = pswp.currSlide
    if (!slide?.width || !slide.height) {
      return initialTarget
    }
    return { rect: computeSlideRect(slide), radius }
  }
  createClock(
    opts.transition.duration,
    EASINGS[opts.transition.easing],
    (eased) => {
      backdrop.current?.paint(eased, false)
      if (flies) {
        const target = liveTarget() ?? initialTarget
        if (target) {
          flight.paint(interpolateFlight(openSource, target, eased))
        }
      }
      if (pswp.element) {
        setChrome(pswp.element, eased)
      }
    },
    () => {
      handOffAdopted(ctx)
      pswp.element?.classList.remove(TRANSITIONING_CLASS)
      flight.unmountLater(1)
      onSettled()
    }
  )
}
