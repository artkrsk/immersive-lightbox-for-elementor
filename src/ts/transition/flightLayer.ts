import { cssEasing } from '../core/cssEasing'
import type { IFlightBox, IFlightLayer } from '../interfaces'
import { createFlightMedia } from './createFlightMedia'
import { flightKeyframes } from './flightKeyframes'

const LAYER_CLASS = 'arts-lightbox-flight'
const MEDIA_CLASS = 'arts-lightbox-flight__media'
const LEAVING_CLASS = 'arts-lightbox-flight_leaving'

/** Only a guard against a missing transition — CSS owns the real duration. */
const LEAVE_FALLBACK_MS = 1000

/**
 * `resolveParent` is called at mount, not now: the flight belongs inside the
 * pswp root so it paints under the controls, and that root does not exist yet
 * when the transition context is built.
 */
export function createFlightLayer(resolveParent: () => HTMLElement): IFlightLayer {
  let el: HTMLDivElement | null = null
  let mediaEl: HTMLElement | null = null
  let box: IFlightBox = { w: 0, h: 0 }
  let animations: Animation[] = []

  const stop = (): void => {
    for (const animation of animations) {
      // A cancel rejects `finished`; nobody awaits it, so swallow the noise.
      animation.finished.catch(() => {})
      animation.cancel()
    }
    animations = []
  }

  const unmount = (): void => {
    stop()
    el?.remove()
    el = null
    mediaEl = null
  }

  return {
    mount: (nextBox, media) => {
      if (el) {
        unmount()
      }
      box = nextBox
      el = document.createElement('div')
      el.className = LAYER_CLASS
      // The only size this box ever has: the raster the compositor keeps.
      el.style.width = `${box.w}px`
      el.style.height = `${box.h}px`
      mediaEl = createFlightMedia(media)
      mediaEl.classList.add(MEDIA_CLASS)
      el.appendChild(mediaEl)
      resolveParent().appendChild(el)
    },
    fly: (frameAt, duration, easing) => {
      if (!el || !mediaEl) {
        return
      }
      stop()
      const keyframes = flightKeyframes(frameAt, box)
      const timing: KeyframeAnimationOptions = { duration, easing: cssEasing(easing), fill: 'both' }
      // Three animations on purpose. The two transforms ride the compositor,
      // which is the whole point; an effect that also carried the radius would
      // drag them onto the main thread (one non-compositable property makes
      // the effect non-compositable). The radius runs there on its own and
      // repaints nothing — a rounded clip is a compositor property too.
      animations = [
        el.animate(keyframes.outer, timing),
        mediaEl.animate(keyframes.inner, timing),
        el.animate(keyframes.radius, timing)
      ]
    },
    retarget: (frameAt) => {
      if (animations.length === 0) {
        return
      }
      const keyframes = flightKeyframes(frameAt, box)
      const effects = [keyframes.outer, keyframes.inner, keyframes.radius]
      animations.forEach((animation, i) => {
        const effect = animation.effect as KeyframeEffect | null
        const next = effects[i]
        if (effect && typeof effect.setKeyframes === 'function' && next) {
          effect.setKeyframes(next)
        }
      })
    },
    arrive: () => {
      // Mount-time fade-in: the close cover must dissolve OVER a playing
      // video, not hard-swap it. Leaving class at 0, forced reflow, then
      // removed — the existing opacity transition carries it to 1.
      if (!el) {
        return
      }
      el.classList.add(LEAVING_CLASS)
      void el.offsetWidth
      el.classList.remove(LEAVING_CLASS)
    },
    leave: () => {
      const current = el
      if (!current) {
        return
      }
      current.classList.add(LEAVING_CLASS)
      let done = false
      const finish = (): void => {
        // Bail if a later mount replaced this layer while it was fading.
        if (done || el !== current) {
          return
        }
        done = true
        unmount()
      }
      current.addEventListener('transitionend', finish, { once: true })
      // No transition means no event — reduced motion, or a theme that
      // overrode it. The layer is already invisible, so this only tidies up.
      setTimeout(finish, LEAVE_FALLBACK_MS)
    },
    detach: () => {
      // The close destroys the root while the flight is still needed for two
      // more frames — see unmountLater. Reparenting is safe here: the
      // animations travel with the element and hold their final frame.
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el)
      }
    },
    unmount,
    unmountLater: (frames) => {
      const current = el
      const step = (n: number): void => {
        if (!current || el !== current) {
          return
        }
        if (n <= 0) {
          unmount()
          return
        }
        requestAnimationFrame(() => {
          step(n - 1)
        })
      }
      step(frames)
    }
  }
}
