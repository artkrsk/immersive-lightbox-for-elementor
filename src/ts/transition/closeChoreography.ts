import { TRANSITIONING_CLASS } from '../constants'
import { EASINGS } from '../core/easings'
import type { IFlightSource, IFlightTarget, ISlideData, ITransitionContext } from '../interfaces'
import { captureFlightSource } from './captureFlightSource'
import { createClock } from './clock'
import { findCloseSource } from './findCloseSource'
import { interpolateFlight } from './interpolateFlight'
import { setChrome } from './setChrome'
import { currentSlideTarget } from './slideTarget'

/**
 * Mounts the return flight when the current slide has a visual to fly:
 * the adopted slide flies the LIVE element home; other videos fly their
 * poster; images fly the full-size image. The landing spot hides until
 * the flight settles on it (it may be a different clone than the one the
 * open launched from).
 */
function mountCloseFlight(
  ctx: ITransitionContext,
  target: IFlightTarget,
  sourceEl: HTMLElement,
  closeSource: IFlightSource,
  slideData: ISlideData | undefined
): boolean {
  const adoptedHere = slideData?.adopted ?? null
  const flies = Boolean(
    slideData?.type === 'image' || adoptedHere || (slideData?.type === 'video' && closeSource.src)
  )
  if (!flies) {
    return false
  }
  if (adoptedHere) {
    adoptedHere.element.controls = false
    ctx.flight.mount(interpolateFlight(closeSource, target, 1), {
      kind: 'element',
      el: adoptedHere.element
    })
  } else {
    // The full-size image is what's on screen — paint the flight with it
    // so the swap is invisible; posters for videos, thumb fallback.
    const src = slideData?.type === 'image' ? slideData.src || closeSource.src : closeSource.src
    ctx.flight.mount(interpolateFlight(closeSource, target, 1), { kind: 'img', src })
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
    const adoptedHere = slideData?.adopted ?? null
    // Fresh measure: the page may have scrolled and the slide may have
    // changed; the return flight re-applies the source's current parallax.
    // The adopted video is NOT in its page slot right now — the recorded
    // home slot stands in for the clip-box walk, and the drift geometry
    // carries over from the open capture (the page behind the open
    // lightbox doesn't scroll, so the drift hasn't moved).
    const closeSource = sourceEl ? captureFlightSource(sourceEl, adoptedHere?.home) : null
    if (adoptedHere && closeSource) {
      closeSource.innerHeightPct = ctx.openSource.innerHeightPct
      closeSource.innerOffsetYPct = ctx.openSource.innerOffsetYPct
    }
    const flies =
      target && closeSource && sourceEl
        ? mountCloseFlight(ctx, target, sourceEl, closeSource, slideData)
        : false

    pswp.element?.classList.add(TRANSITIONING_CLASS)
    backdrop.current?.beginClose()

    createClock(
      opts.transition.duration,
      EASINGS[opts.transition.easing],
      (eased) => {
        const rt = 1 - eased
        backdrop.current?.paint(rt, true)
        if (flies && target && closeSource) {
          flight.paint(interpolateFlight(closeSource, target, rt))
        }
        if (pswp.element) {
          setChrome(pswp.element, rt)
        }
      },
      () => {
        // The adopted video goes home BEFORE teardown: mute restored first
        // inside return(), placement and styles after. Its last frame stays
        // painted in the flight (the reparented element re-attaches its
        // compositor texture and can blank briefly) — the cover lifts two
        // frames later.
        flight.freeze()
        slideData?.adopted?.return()
        backdrop.current?.destroy()
        backdrop.current = null
        pswp.destroy() // restores hidden sources + any un-returned adoptee
        flight.unmountLater(2)
        requestAnimationFrame(() => {
          resolve()
        })
      }
    )
  })
}
