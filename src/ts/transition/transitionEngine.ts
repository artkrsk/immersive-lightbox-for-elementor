import type PhotoSwipe from 'photoswipe'
import { EASINGS } from '../core/easings'
import type {
  IFlightSource,
  IFlightTarget,
  IOpenRequest,
  IOptions,
  ITransitionHandle
} from '../interfaces'
import { createBackdrop } from './backdrop'
import { captureFlightSource } from './captureFlightSource'
import { createClock } from './clock'
import { computeSlideRect } from './computeSlideRect'
import { createFlightLayer } from './flightLayer'
import { interpolateFlight } from './interpolateFlight'

const TRANSITIONING_CLASS = 'arts-lightbox-transitioning'
const SLIDE_RADIUS = 6
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

function setChrome(root: HTMLElement, t: number): void {
  root.style.setProperty('--arts-lightbox-chrome', String(clamp01((t - 0.65) / 0.35)))
}

/** The current slide's rect, or null when PhotoSwipe has nothing placed. */
function currentSlideTarget(pswp: PhotoSwipe): IFlightTarget | null {
  const slide = pswp.currSlide
  if (!slide?.width || !slide.height) {
    return null
  }
  return { rect: computeSlideRect(slide), radius: SLIDE_RADIUS }
}

/** Nearest on-screen DOM instance of the current slide's key, for the return flight. */
function findCloseSource(pswp: PhotoSwipe, req: IOpenRequest): HTMLElement | null {
  const key = req.gallery.slides[pswp.currIndex]?.key
  const instances = key ? (req.gallery.elementsByKey.get(key) ?? []) : []
  for (const el of instances) {
    const rect = el.getBoundingClientRect()
    if (rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0) {
      return el
    }
  }
  return null
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
  req: IOpenRequest
): ITransitionHandle {
  const ease = EASINGS[opts.transition.easing]
  const duration = opts.transition.duration
  const flight = createFlightLayer()
  let backdrop: ReturnType<typeof createBackdrop> | null = null
  let transitioning = true
  let closing = false

  // Captured synchronously at click time, before any layout work.
  const openSource: IFlightSource =
    req.gallery.slides[req.index]?.type === 'image'
      ? captureFlightSource(req.sourceElement)
      : {
          rect: { x: 0, y: 0, w: 0, h: 0 },
          radius: 0,
          innerHeightPct: 100,
          innerOffsetYPct: 0,
          src: ''
        }

  pswp.on('firstUpdate', () => {
    pswp.element?.classList.add(TRANSITIONING_CLASS)
    if (pswp.element) {
      setChrome(pswp.element, 0)
      backdrop = createBackdrop(pswp.element, opts)
    }
  })

  pswp.on('afterInit', () => {
    const target = currentSlideTarget(pswp)
    const flies = Boolean(target && openSource.src)
    if (flies && target) {
      flight.mount(interpolateFlight(openSource, target, 0), openSource.src)
    }
    createClock(
      duration,
      ease,
      (eased) => {
        backdrop?.paint(eased, false)
        if (flies && target) {
          flight.paint(interpolateFlight(openSource, target, eased))
        }
        if (pswp.element) {
          setChrome(pswp.element, eased)
        }
      },
      () => {
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
      // Fresh measure: the page may have scrolled and the slide may have
      // changed; the return flight re-applies the source's current parallax.
      const closeSource = sourceEl ? captureFlightSource(sourceEl) : null
      const flies = Boolean(target && closeSource && slideData?.type === 'image')

      if (flies && target && closeSource) {
        // The full-size image is what's on screen — paint the flight with it
        // so the swap is invisible; fall back to the thumb source.
        const src = slideData?.src || closeSource.src
        flight.mount(interpolateFlight(closeSource, target, 1), src)
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
          backdrop?.destroy()
          backdrop = null
          pswp.destroy()
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
