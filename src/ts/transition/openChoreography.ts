import { TRANSITIONING_CLASS } from '../constants'
import { EASINGS } from '../core/easings'
import type { IFlightTarget, ITransitionContext } from '../interfaces'
import { playingSignal } from '../video/playingSignal'
import { createClock } from './clock'
import { computeSlideRect } from './computeSlideRect'
import { decodedImages } from './decodedImages'
import { interpolateFlight } from './interpolateFlight'
import { paintCoverlessFade } from './paintCoverlessFade'
import { setChrome } from './setChrome'
import { currentSlideTarget } from './slideTarget'

/** The poster cover never outstays a stalled player by more than this. */
const PLAYING_COVER_MAX_MS = 1200

/** The landed flight never outstays a slow full-size decode by more than this. */
const FULL_DECODE_MAX_MS = 1000

/**
 * The full-size file of an image slide, when it is not the file the page is
 * already showing. A video flies its poster and keeps it.
 */
function fullSizeSrc(ctx: ITransitionContext): string | null {
  const slide = ctx.req.gallery.slides[ctx.req.index]
  if (slide?.type !== 'image') {
    return null
  }
  const full = slide.src
  return full && full !== ctx.openSource.src ? full : null
}

/**
 * What the flight carries, decided ONCE at mount. The flying img never
 * changes its file mid-flight: a new file inside a layer already on screen is
 * a fresh decode and a fresh raster the compositor holds no tiles for — the
 * window a hole opens in, with nothing underneath once the source is hidden.
 *
 * The full-size file flies when the hover warm-up has already decoded it. A
 * cold full-size file lets the page's own candidate fly instead (decoded by
 * definition: it is on screen) while the full one decodes in the background,
 * and the hand-off onto the sharp slide waits for that decode, capped.
 */
function pickFlightSrc(ctx: ITransitionContext): { src: string; fullReady: Promise<void> | null } {
  const full = fullSizeSrc(ctx)
  if (!full) {
    return { src: ctx.openSource.src, fullReady: null }
  }
  if (decodedImages.has(full)) {
    return { src: full, fullReady: null }
  }
  return { src: ctx.openSource.src, fullReady: decodedImages.warm(full) }
}

/**
 * The open reveal on the one shared clock: backdrop, flight interpolation
 * and chrome opacity all read the same eased value. The real slide stays
 * hidden (TRANSITIONING_CLASS) until the flight lands exactly on it.
 *
 * The clicked element stays on the page for the whole open. The flight
 * launches exactly on its rect and only grows, so it covers the original for
 * every frame it is up — and a frame where the clone has not painted yet (a
 * raster or decode that lost a race) shows the original through it, which is
 * the right picture, rather than the page background. The source is hidden
 * only once the backdrop is opaque, where no one can see it go; what that
 * buys is a close flight that lands on an element nothing else paints.
 */
export function runOpenChoreography(ctx: ITransitionContext, onSettled: () => void): void {
  const { pswp, opts, flight, backdrop, hidden, openSource } = ctx
  const initialTarget = currentSlideTarget(pswp)
  const flies = Boolean(initialTarget && openSource.src)
  let fullReady: Promise<void> | null = null
  const ease = EASINGS[opts.transition.easing]
  if (flies && initialTarget) {
    const pick = pickFlightSrc(ctx)
    fullReady = pick.fullReady
    flight.mount({ w: initialTarget.rect.w, h: initialTarget.rect.h }, { src: pick.src })
    flight.fly(
      (progress) => interpolateFlight(openSource, initialTarget, progress),
      opts.transition.duration,
      opts.transition.easing
    )
  }
  // The landing rect is LIVE: explore mode already pans the (hidden) slide
  // toward the mouse during the transition, so the flight re-reads the
  // slide's actual pan every frame and re-aims at wherever the pointer
  // steered it — no snap at hand-off. Radius is cached; slide rect math is
  // pure. The compositor keeps the animation's time; only its keyframes move.
  const radius = initialTarget?.radius ?? 0
  let aimedAt = initialTarget
  const liveTarget = (): IFlightTarget | null => {
    const slide = pswp.currSlide
    if (!slide?.width || !slide.height) {
      return initialTarget
    }
    return { rect: computeSlideRect(slide), radius }
  }
  const sameRect = (a: IFlightTarget | null, b: IFlightTarget | null): boolean =>
    a === b ||
    (a !== null &&
      b !== null &&
      a.rect.x === b.rect.x &&
      a.rect.y === b.rect.y &&
      a.rect.w === b.rect.w &&
      a.rect.h === b.rect.h)
  // With no flight there is no cover, so TRANSITIONING_CLASS has nothing to
  // protect — held to the end it just made the content POP into place. The
  // container rises and fades in on the clock instead. The hidden state goes
  // on inline BEFORE the class comes off: the class is what is currently
  // hiding it, and dropping it first would flash the content for a frame.
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
        const target = liveTarget()
        if (target && !sameRect(target, aimedAt)) {
          aimedAt = target
          flight.retarget((progress) => interpolateFlight(openSource, target, progress))
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
      // Under the opaque backdrop now — and only while the opened slide is
      // still the current one; a navigation mid-open already moved on.
      if (flies && pswp.currIndex === ctx.req.index) {
        hidden.hide(openSource.element)
      }
      // Fade rather than cut. When both layers hold the same image over an
      // opaque backing, this is invisible — an identical opaque image
      // composited over itself is unchanged at any alpha. It only does work
      // when the two genuinely differ, which is exactly the case a cut made
      // obvious.
      //
      // A cold video slide holds its poster cover a little longer: the flight
      // stays pinned on the landed rect until the player reports real frames
      // (or the fallback lapses), so the fade reveals a PLAYING video rather
      // than a black loading iframe. A cold full-size image holds the same
      // way until its decode lands, so the fade reveals a sharp slide rather
      // than a placeholder. leave() self-guards against remounts.
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
      } else if (flies && fullReady) {
        const fallback = new Promise<void>((resolve) => {
          setTimeout(resolve, FULL_DECODE_MAX_MS)
        })
        void Promise.race([fullReady, fallback]).then(() => {
          flight.leave()
        })
      } else {
        flight.leave()
      }
      onSettled()
    }
  )
}
