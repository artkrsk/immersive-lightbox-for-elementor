import { EASINGS } from '../core/easings'
import type {
  IFlightSource,
  IFlightTarget,
  IOpenRequest,
  IOptions,
  ITransitionHandle
} from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { createBackdrop } from './backdrop'
import { captureFlightSource } from './captureFlightSource'
import { createClock } from './clock'
import { computeSlideRect } from './computeSlideRect'
import { createFlightLayer } from './flightLayer'
import { interpolateFlight } from './interpolateFlight'

const TRANSITIONING_CLASS = 'arts-lightbox-transitioning'
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * The slide's designed corner radius — the flight must land exactly on it
 * or every hand-off pops. Read from the themable custom property that also
 * paints .pswp__img.
 */
function readSlideRadius(pswpRoot: HTMLElement | undefined): number {
  if (!pswpRoot) {
    return 0
  }
  return (
    Number.parseFloat(
      getComputedStyle(pswpRoot).getPropertyValue('--arts-lightbox-slide-radius')
    ) || 0
  )
}

function setChrome(root: HTMLElement, t: number): void {
  root.style.setProperty('--arts-lightbox-chrome', String(clamp01((t - 0.65) / 0.35)))
}

/** The current slide's rect, or null when PhotoSwipe has nothing placed. */
function currentSlideTarget(pswp: PhotoSwipe): IFlightTarget | null {
  const slide = pswp.currSlide
  if (!slide?.width || !slide.height) {
    return null
  }
  return { rect: computeSlideRect(slide), radius: readSlideRadius(pswp.element) }
}

function isOnScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0
}

/**
 * The element the return flight lands on. The element the user actually
 * opened from wins while it still shows the current slide (several clones
 * can be on screen at once — landing on a sibling clone while the original
 * sits hidden reads as closing "to the wrong image"). Fallback: the first
 * on-screen instance of the current slide's key.
 */
function findCloseSource(pswp: PhotoSwipe, req: IOpenRequest): HTMLElement | null {
  const key = req.gallery.slides[pswp.currIndex]?.key
  if (!key) {
    return null
  }
  const instances = req.gallery.elementsByKey.get(key) ?? []
  const original = req.sourceElement
  if (instances.includes(original) && original.isConnected && isOnScreen(original)) {
    return original
  }
  return instances.find((el) => el.isConnected && isOnScreen(el)) ?? null
}

/**
 * Wires the open choreography onto a freshly constructed (not yet inited)
 * pswp core and returns the handle that owns the matching close.
 *
 * One clock drives everything: backdrop reveal, flight interpolation and
 * chrome opacity all read the same eased value. The real slide stays hidden
 * (TRANSITIONING_CLASS) until the flight lands exactly on it.
 */
export function attachOpenTransition(
  pswp: PhotoSwipe,
  opts: IOptions,
  req: IOpenRequest,
  instant = false
): ITransitionHandle {
  const ease = EASINGS[opts.transition.easing]
  const duration = opts.transition.duration
  const flight = createFlightLayer()
  let backdrop: ReturnType<typeof createBackdrop> | null = null
  let transitioning = !instant
  let closing = false

  // Captured synchronously at click time, before any layout work. Videos
  // fly too: adopted ones as the LIVE element, others via their poster.
  const openSlide = req.gallery.slides[req.index]
  const adopted = openSlide?.adopted ?? null
  const openSource: IFlightSource =
    openSlide?.type === 'image' || openSlide?.type === 'video'
      ? captureFlightSource(req.sourceElement)
      : {
          rect: { x: 0, y: 0, w: 0, h: 0 },
          radius: 0,
          innerHeightPct: 100,
          innerOffsetYPct: 0,
          src: ''
        }

  pswp.on('firstUpdate', () => {
    if (pswp.element) {
      setChrome(pswp.element, instant ? 1 : 0)
      backdrop = createBackdrop(pswp.element, opts)
      if (instant) {
        // Pass-through gallery swap: the backdrop is already up — land fully
        // open with no choreography.
        backdrop.paint(1, false)
      } else {
        pswp.element.classList.add(TRANSITIONING_CLASS)
      }
    }
  })

  // The clicked element hides while its flight clone flies — otherwise the
  // "cloning" is visible (original still sitting on the page). Restored on
  // destroy, whatever path led there.
  const hidden = new Set<HTMLElement>()
  const hide = (el: HTMLElement): void => {
    el.style.visibility = 'hidden'
    hidden.add(el)
  }
  const restoreHidden = (): void => {
    for (const el of hidden) {
      el.style.visibility = ''
    }
    hidden.clear()
  }
  pswp.on('destroy', restoreHidden)
  // Whatever path led to destroy, an adopted video ALWAYS goes home
  // (idempotent — the choreographed close already returned it).
  pswp.on('destroy', () => {
    adopted?.return()
  })

  // Navigating away from a slide restores its hidden source right away —
  // the backdrop is fully opaque mid-session, so the restore is invisible.
  // Without this, closing from another slide reveals a hole where the
  // originally-clicked element still sat hidden.
  pswp.on('change', () => {
    const key = req.gallery.slides[pswp.currIndex]?.key
    const instances = key ? (req.gallery.elementsByKey.get(key) ?? []) : []
    for (const el of hidden) {
      if (!instances.includes(el)) {
        el.style.visibility = ''
        hidden.delete(el)
      }
    }
  })

  pswp.on('afterInit', () => {
    if (instant) {
      return
    }
    const initialTarget = currentSlideTarget(pswp)
    const flies = Boolean(initialTarget && (adopted || openSource.src))
    if (flies && initialTarget) {
      flight.mount(
        interpolateFlight(openSource, initialTarget, 0),
        adopted ? { kind: 'element', el: adopted.take() } : { kind: 'img', src: openSource.src }
      )
      hide(req.sourceElement)
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
      duration,
      ease,
      (eased) => {
        backdrop?.paint(eased, false)
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
        // Adopted video hand-off: flight → slide container, same task, so
        // playback never pauses. Controls appear only inside the lightbox.
        if (adopted) {
          const el = flight.extract()
          const container = pswp.currSlide?.content?.element
          if (el && container) {
            container.appendChild(el)
            adopted.element.controls = true
          } else {
            adopted.return()
          }
        }
        pswp.element?.classList.remove(TRANSITIONING_CLASS)
        requestAnimationFrame(() => {
          flight.unmount()
        })
        transitioning = false
      }
    )
  })

  const close = (): Promise<void> => {
    if (closing || transitioning) {
      return Promise.resolve()
    }
    closing = true
    return new Promise((resolve) => {
      const target = currentSlideTarget(pswp)
      const sourceEl = findCloseSource(pswp, req)
      const slideData = req.gallery.slides[pswp.currIndex]
      // Closing on the adopted slide flies the LIVE element home; other
      // videos fly their poster; images fly the full-size image.
      const adoptedHere = slideData?.adopted ?? null
      // Fresh measure: the page may have scrolled and the slide may have
      // changed; the return flight re-applies the source's current parallax.
      // The adopted video is NOT in its page slot right now — the recorded
      // home slot stands in for the clip-box walk, and the drift geometry
      // carries over from the open capture (the page behind the open
      // lightbox doesn't scroll, so the drift hasn't moved).
      const closeSource = sourceEl ? captureFlightSource(sourceEl, adoptedHere?.home) : null
      if (adoptedHere && closeSource) {
        closeSource.innerHeightPct = openSource.innerHeightPct
        closeSource.innerOffsetYPct = openSource.innerOffsetYPct
      }
      const flies = Boolean(
        target &&
          closeSource &&
          sourceEl &&
          (slideData?.type === 'image' ||
            adoptedHere ||
            (slideData?.type === 'video' && closeSource.src))
      )

      if (flies && target && closeSource && sourceEl) {
        if (adoptedHere) {
          adoptedHere.element.controls = false
          flight.mount(interpolateFlight(closeSource, target, 1), {
            kind: 'element',
            el: adoptedHere.element
          })
        } else {
          // The full-size image is what's on screen — paint the flight with
          // it so the swap is invisible; posters for videos, thumb fallback.
          const src =
            slideData?.type === 'image' ? slideData.src || closeSource.src : closeSource.src
          flight.mount(interpolateFlight(closeSource, target, 1), { kind: 'img', src })
        }
        // The landing spot hides until the flight settles on it (it may be a
        // different clone than the one the open launched from).
        hide(sourceEl)
      }
      pswp.element?.classList.add(TRANSITIONING_CLASS)
      backdrop?.beginClose()

      createClock(
        duration,
        ease,
        (eased) => {
          const rt = 1 - eased
          backdrop?.paint(rt, true)
          if (flies && target && closeSource) {
            flight.paint(interpolateFlight(closeSource, target, rt))
          }
          if (pswp.element) {
            setChrome(pswp.element, rt)
          }
        },
        () => {
          // The adopted video goes home BEFORE teardown: mute restored
          // first inside return(), placement and styles after — the flight
          // frame it leaves gets removed a frame later.
          slideData?.adopted?.return()
          backdrop?.destroy()
          backdrop = null
          pswp.destroy() // restores hidden sources + any un-returned adoptee
          requestAnimationFrame(() => {
            flight.unmount()
            resolve()
          })
        }
      )
    })
  }

  return {
    close,
    isTransitioning: () => transitioning || closing
  }
}
