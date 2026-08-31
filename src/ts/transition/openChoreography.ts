import { TRANSITIONING_CLASS } from '../constants'
import { EASINGS } from '../core/easings'
import type { IFlightTarget, ITransitionContext } from '../interfaces'
import { playingSignal } from '../video/playingSignal'
import { createClock } from './clock'
import { computeSlideRect } from './computeSlideRect'
import { interpolateFlight } from './interpolateFlight'
import { paintCoverlessFade } from './paintCoverlessFade'
import { setChrome } from './setChrome'
import { currentSlideTarget } from './slideTarget'

/** The poster cover never outstays a stalled player by more than this. */
const PLAYING_COVER_MAX_MS = 1200

/**
 * Frames the clicked element stays put after the flight mounts over it.
 *
 * The clone is a FRESH img painting the file at a magnification nothing on the
 * page has rastered — the page's copy is drawn at its own scale, the clone's at
 * the source rect's — so the compositor has real work to do before it holds any
 * tiles for the flight. Hiding the source in the same frame is what leaves a
 * hole where the image was, and then a stretched low-res stand-in over nothing
 * once the first coarse tiles land. The overlap costs nothing: the flight
 * launches exactly on the source rect and only grows from there, so it covers
 * what it replaces for every frame it is up.
 */
const SOURCE_HANDOFF_FRAMES = 2

/**
 * The flight launches with the page thumbnail, because that is the only image
 * that exists at click time. The full-size one is usually moments away — hover
 * prefetch has often already put it in cache under the same URL — so repoint
 * the flight at it as soon as it can be painted, and it lands at the same
 * resolution as the slide underneath rather than swapping at the last frame.
 *
 * The probe exists to decode: assigning an undecoded src to an element already
 * on screen is what produces a flash. Everything here is best-effort — a slow
 * or failed decode just leaves the thumbnail flying, which is what it did
 * before — so nothing in this path may reject an open.
 */
function upgradeFlight(ctx: ITransitionContext): void {
  const slide = ctx.req.gallery.slides[ctx.req.index]
  // Video slides fly their poster; the slide's own src is a video URL.
  if (slide?.type !== 'image') {
    return
  }
  const full = slide.src
  if (!full || full === ctx.openSource.src) {
    return
  }
  const probe = new Image()
  probe.src = full
  probe
    .decode()
    .then(() => {
      ctx.flight.upgrade(full)
    })
    .catch(() => {
      // Thumbnail keeps flying. The hand-off cross-fade covers the difference.
    })
}

/**
 * The open reveal on the one shared clock: backdrop, flight interpolation
 * and chrome opacity all read the same eased value. The real slide stays
 * hidden (TRANSITIONING_CLASS) until the flight lands exactly on it.
 */
export function runOpenChoreography(ctx: ITransitionContext, onSettled: () => void): void {
  const { pswp, opts, flight, backdrop, hidden, openSource } = ctx
  const initialTarget = currentSlideTarget(pswp)
  const flies = Boolean(initialTarget && openSource.src)
  if (flies && initialTarget) {
    flight.mount(interpolateFlight(openSource, initialTarget, 0), { src: openSource.src })
    hidden.hideAfterFrames(ctx.req.sourceElement, SOURCE_HANDOFF_FRAMES)
    upgradeFlight(ctx)
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
  // With no flight there is no cover, so TRANSITIONING_CLASS has nothing to
  // protect — held to the end it just made the content POP into place. The
  // container rises and fades in on the clock instead. The hidden state goes
  // on inline BEFORE the class comes off: the class is what is currently
  // hiding it, and dropping it first would flash the content for a frame.
  const ease = EASINGS[opts.transition.easing]
  const container = pswp.element?.querySelector<HTMLElement>('.pswp__container') ?? null
  if (!flies && container) {
    paintCoverlessFade(container, 1, ease)
    pswp.element?.classList.remove(TRANSITIONING_CLASS)
  }
  createClock(
    opts.transition.duration,
    ease,
    (eased, raw) => {
      backdrop.current?.paint(eased, false)
      if (flies) {
        const target = liveTarget() ?? initialTarget
        if (target) {
          flight.paint(interpolateFlight(openSource, target, eased))
        }
      }
      // The close's curve run backwards: nothing for the first half while the
      // veil establishes the stage, then the content arrives on the back half.
      if (!flies && container) {
        paintCoverlessFade(container, 1 - raw, ease)
      }
      if (pswp.element) {
        setChrome(pswp.element, eased)
      }
    },
    () => {
      pswp.element?.classList.remove(TRANSITIONING_CLASS)
      // The fade ends opaque and in place, so this hands the container back to
      // the stylesheet without a step — and leaves nothing inline behind for
      // the rest of the session.
      if (container) {
        container.style.opacity = ''
        container.style.translate = ''
      }
      // Fade rather than cut. When the upgrade landed, both layers hold the
      // same image over an opaque backing, so this is invisible — an identical
      // opaque image composited over itself is unchanged at any alpha. It only
      // does work when the two genuinely differ, which is exactly the case a
      // cut made obvious.
      //
      // A cold video slide holds its poster cover a little longer: the flight
      // stays pinned on the landed rect until the player reports real frames
      // (or the fallback lapses), so the fade reveals a PLAYING video rather
      // than a black loading iframe. leave() self-guards against remounts.
      const slideType = ctx.req.gallery.slides[ctx.req.index]?.type
      if (flies && slideType === 'video') {
        const el = pswp.currSlide?.content?.element
        const signal = el ? playingSignal.get(el) : undefined
        const fallback = new Promise<void>((resolve) => {
          setTimeout(resolve, PLAYING_COVER_MAX_MS)
        })
        void Promise.race([signal ?? fallback, fallback]).then(() => {
          flight.leave()
        })
      } else {
        flight.leave()
      }
      onSettled()
    }
  )
}
