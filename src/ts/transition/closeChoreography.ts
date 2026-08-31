import { CLOSING_CLASS, TRANSITIONING_CLASS } from '../constants'
import { EASINGS } from '../core/easings'
import type { IFlightSource, IFlightTarget, ISlideData, ITransitionContext } from '../interfaces'
import { captureFlightSource } from './captureFlightSource'
import { createClock } from './clock'
import { findCloseSource } from './findCloseSource'
import { interpolateFlight } from './interpolateFlight'
import { paintCoverlessFade } from './paintCoverlessFade'
import { setChrome } from './setChrome'
import { slideFlies } from './slideFlies'
import { currentSlideTarget } from './slideTarget'

/**
 * Mounts the return flight when the current slide has a visual to fly:
 * videos fly their poster, images the full-size image. The landing spot
 * hides until the flight settles on it (it may be a different clone than
 * the one the open launched from).
 */
function mountCloseFlight(
  ctx: ITransitionContext,
  target: IFlightTarget,
  sourceEl: HTMLElement,
  closeSource: IFlightSource,
  slideData: ISlideData | undefined
): boolean {
  // A flight needs something real to paint at BOTH ends. Slide type alone was
  // never that test — a button, a text link or a dynamic-tag trigger opens an
  // image slide while owning no visual, and the photo morphed down into the
  // button on close. This is the rule the open already applies
  // (`openSource.src`), so a close now flies exactly where its own open flew.
  if (!closeSource.src || !slideFlies(slideData, sourceEl)) {
    return false
  }
  // The full-size image is what's on screen — paint the flight with it
  // so the swap is invisible; posters for videos, thumb fallback.
  const src = slideData?.type === 'image' ? slideData.src || closeSource.src : closeSource.src
  ctx.flight.mount(interpolateFlight(closeSource, target, 1), { src })
  if (slideData?.type === 'video') {
    // A poster hard-mounted over a PLAYING video is a visible content cut —
    // fade the cover in instead.
    ctx.flight.arrive()
  }
  ctx.hidden.hide(sourceEl)
  return true
}

/** The close reveal: the same shared clock, run in reverse. */
export function runCloseChoreography(ctx: ITransitionContext): Promise<void> {
  const { pswp, opts, req, flight, backdrop } = ctx
  return new Promise((resolve) => {
    const target = currentSlideTarget(pswp)
    const sourceEl = findCloseSource(pswp, req)
    const slideData = req.gallery.slides[pswp.currIndex]
    // Fresh measure: the page may have scrolled and the slide may have
    // changed; the return flight re-applies the source's current parallax.
    const closeSource = sourceEl ? captureFlightSource(sourceEl) : null
    const flies =
      target && closeSource && sourceEl
        ? mountCloseFlight(ctx, target, sourceEl, closeSource, slideData)
        : false

    // With a covering flight the container can vanish instantly — the flight
    // masks the cut. A cover-less slide (html, a video with nothing to fly)
    // fades on the shared clock instead of hard-vanishing.
    const container = pswp.element?.querySelector<HTMLElement>('.pswp__container') ?? null
    if (flies) {
      pswp.element?.classList.add(TRANSITIONING_CLASS)
    }
    // Nothing in here can be acted on once the close is running, so it stops
    // answering the pointer entirely: hovering the departing slide was still
    // offering a zoom, and a click could still land on chrome that is on its
    // way out. Covers both closes — the flight-covered one and the fade.
    pswp.element?.classList.add(CLOSING_CLASS)
    backdrop.current?.beginClose()

    const ease = EASINGS[opts.transition.easing]
    createClock(
      opts.transition.duration,
      ease,
      (eased, raw) => {
        const rt = 1 - eased
        backdrop.current?.paint(rt, true)
        if (flies && target && closeSource) {
          flight.paint(interpolateFlight(closeSource, target, rt))
        }
        if (!flies && container) {
          paintCoverlessFade(container, raw, ease)
        }
        if (pswp.element) {
          setChrome(pswp.element, rt)
        }
      },
      () => {
        backdrop.current?.destroy()
        backdrop.current = null
        // Out of the root before the root goes: the flight lives inside it so
        // it paints under the chrome, but it has to survive the teardown.
        flight.detach()
        pswp.destroy() // restores hidden sources
        flight.unmountLater(2)
        requestAnimationFrame(() => {
          resolve()
        })
      }
    )
  })
}
