import { ATTR_FLY } from '../constants'
import { cssEasing } from '../core/cssEasing'
import type { IFlightBox, IFlightExtra, IFlightLayer } from '../interfaces'
import { createFlightMedia } from './createFlightMedia'
import { flightKeyframes } from './flightKeyframes'

const LAYER_CLASS = 'arts-lightbox-flight'
const MEDIA_CLASS = 'arts-lightbox-flight__media'
const VEIL_CLASS = 'arts-lightbox-flight__veil'
const EXTRA_CLASS = 'arts-lightbox-flight__extra'
const EXTRA_HOVER_CLASS = 'arts-lightbox-flight__extra_hover'
const LEAVING_CLASS = 'arts-lightbox-flight_leaving'

/** Only a guard against a missing transition — CSS owns the real duration. */
const LEAVE_FALLBACK_MS = 1000

/**
 * A caption's clone, cut off from its ancestors: the captured computed values
 * go inline, its own motion is neutralised (the wrapper already sits where
 * the motion left it) and it fills the wrapper, whatever insets positioned
 * the original.
 */
function createExtra(extra: IFlightExtra): HTMLElement {
  if (extra.kind === 'veil') {
    const veil = document.createElement('div')
    veil.className = VEIL_CLASS
    Object.assign(veil.style, extra.styles)
    return veil
  }
  const wrap = document.createElement('div')
  wrap.className = extra.hover ? `${EXTRA_CLASS} ${EXTRA_HOVER_CLASS}` : EXTRA_CLASS
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.width = `${extra.width}px`
  wrap.style.height = `${extra.height}px`
  const clone = extra.element.cloneNode(true) as HTMLElement
  clone.removeAttribute(ATTR_FLY)
  clone.removeAttribute('id')
  for (const node of clone.querySelectorAll('[id]')) {
    node.removeAttribute('id')
  }
  Object.assign(clone.style, extra.styles, {
    position: 'absolute',
    inset: '0',
    margin: '0',
    translate: 'none',
    transform: 'none',
    scale: 'none',
    rotate: 'none',
    opacity: '1'
  })
  wrap.appendChild(clone)
  return wrap
}

/**
 * `resolveParent` is called at mount, not now: the flight belongs inside the
 * pswp root so it paints under the controls, and that root does not exist yet
 * when the transition context is built.
 */
export function createFlightLayer(resolveParent: () => HTMLElement): IFlightLayer {
  let el: HTMLDivElement | null = null
  let mediaEl: HTMLElement | null = null
  let box: IFlightBox = { w: 0, h: 0 }
  let extras: IFlightExtra[] = []
  let extraEls: HTMLElement[] = []
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
    extras = []
    extraEls = []
  }

  /** The animated elements in track order: outer, inner, radius, then each
   *  extra's placement (captions only) and opacity. */
  const targets = (): HTMLElement[] => {
    if (!el || !mediaEl) {
      return []
    }
    const list = [el, mediaEl, el]
    extras.forEach((extra, i) => {
      const target = extraEls[i]
      if (!target) {
        return
      }
      if (extra.kind === 'caption') {
        list.push(target)
      }
      list.push(target)
    })
    return list
  }

  return {
    mount: (nextBox, media, nextExtras = []) => {
      if (el) {
        unmount()
      }
      box = nextBox
      extras = [...nextExtras]
      el = document.createElement('div')
      el.className = LAYER_CLASS
      // The only size this box ever has: the raster the compositor keeps.
      el.style.width = `${box.w}px`
      el.style.height = `${box.h}px`
      mediaEl = createFlightMedia(media)
      mediaEl.classList.add(MEDIA_CLASS)
      el.appendChild(mediaEl)
      extraEls = extras.map((extra) => createExtra(extra))
      for (const extraEl of extraEls) {
        el.appendChild(extraEl)
      }
      resolveParent().appendChild(el)
    },
    fly: (frameAt, duration, easing) => {
      if (!el || !mediaEl) {
        return
      }
      stop()
      const keyframes = flightKeyframes(frameAt, box, extras)
      const timing: KeyframeAnimationOptions = { duration, easing: cssEasing(easing), fill: 'both' }
      // One animation per track on purpose. The transforms and opacities ride
      // the compositor, which is the whole point; an effect that also carried
      // the radius would drag them onto the main thread (one non-compositable
      // property makes the effect non-compositable). The radius runs there on
      // its own and repaints nothing — a rounded clip is a compositor property.
      const tracks = [keyframes.outer, keyframes.inner, keyframes.radius, ...keyframes.extras]
      animations = targets().map((target, i) => target.animate(tracks[i] ?? [], timing))
    },
    retarget: (frameAt) => {
      if (animations.length === 0) {
        return
      }
      const keyframes = flightKeyframes(frameAt, box, extras)
      const tracks = [keyframes.outer, keyframes.inner, keyframes.radius, ...keyframes.extras]
      animations.forEach((animation, i) => {
        const effect = animation.effect as KeyframeEffect | null
        const next = tracks[i]
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
