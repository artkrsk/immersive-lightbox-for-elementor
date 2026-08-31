import type { IFlightFrame, IFlightLayer } from '../interfaces'
import { isTagElement } from '../utils/isTagElement'
import { createFlightMedia } from './createFlightMedia'
import { flightFrameStyles } from './flightFrameStyles'

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

  const paint = (frame: IFlightFrame): void => {
    if (!el || !mediaEl) {
      return
    }
    const style = flightFrameStyles(frame)
    el.style.transform = style.transform
    el.style.width = style.width
    el.style.height = style.height
    el.style.borderRadius = style.borderRadius
    mediaEl.style.height = style.innerHeight
    mediaEl.style.transform = style.innerTransform
  }

  const unmount = (): void => {
    el?.remove()
    el = null
    mediaEl = null
  }

  return {
    mount: (frame, media) => {
      if (el) {
        el.remove()
      }
      el = document.createElement('div')
      el.className = LAYER_CLASS
      mediaEl = createFlightMedia(media)
      mediaEl.classList.add(MEDIA_CLASS)
      el.appendChild(mediaEl)
      resolveParent().appendChild(el)
      paint(frame)
    },
    upgrade: (src) => {
      if (!el || !isTagElement(mediaEl, 'img')) {
        return
      }
      mediaEl.src = src
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
      // more frames — see unmountLater. Reparenting is safe here: the layer is
      // painted per frame by JS, so there is no transition to interrupt, and
      // by now it is already sitting on its final frame.
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el)
      }
    },
    paint,
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
