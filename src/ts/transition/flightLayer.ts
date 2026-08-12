import type { IFlightFrame } from '../interfaces'

const LAYER_CLASS = 'arts-lightbox-flight'
const MEDIA_CLASS = 'arts-lightbox-flight__media'

/** What the flight carries: a fresh img clone, or a LIVE element (an
 *  adopted video keeps playing while it flies). */
export type TFlightMedia = { kind: 'img'; src: string } | { kind: 'element'; el: HTMLElement }

/**
 * The promoted element that travels above the curtain. A fixed-position
 * frame with overflow hidden; the inner media repaints from the
 * interpolated overscan/offset percentages each frame.
 */
export function createFlightLayer(): {
  mount(frame: IFlightFrame, media: TFlightMedia): void
  paint(frame: IFlightFrame): void
  /** Element mode: hand the live media out (to the slide / the page slot)
   *  without destroying it. */
  extract(): HTMLElement | null
  unmount(): void
} {
  let el: HTMLDivElement | null = null
  let mediaEl: HTMLElement | null = null
  let owned = false // img clones are ours to destroy; live elements are not

  const paint = (frame: IFlightFrame): void => {
    if (!el || !mediaEl) {
      return
    }
    el.style.transform = `translate(${frame.x}px, ${frame.y}px)`
    el.style.width = `${frame.w}px`
    el.style.height = `${frame.h}px`
    el.style.borderRadius = `${frame.radius}px`
    mediaEl.style.height = `${frame.innerHeightPct}%`
    mediaEl.style.transform = `translateY(${(frame.innerOffsetYPct / frame.innerHeightPct) * 100}%)`
  }

  return {
    mount: (frame, media) => {
      if (el) {
        el.remove()
      }
      el = document.createElement('div')
      el.className = LAYER_CLASS
      if (media.kind === 'img') {
        const img = document.createElement('img')
        img.alt = ''
        img.src = media.src
        mediaEl = img
        owned = true
      } else {
        mediaEl = media.el
        owned = false
      }
      mediaEl.classList.add(MEDIA_CLASS)
      el.appendChild(mediaEl)
      document.body.appendChild(el)
      paint(frame)
    },
    paint,
    extract: () => {
      if (!mediaEl || owned) {
        return null
      }
      const media = mediaEl
      media.classList.remove(MEDIA_CLASS)
      media.style.removeProperty('height')
      media.style.removeProperty('transform')
      media.remove()
      mediaEl = null
      return media
    },
    unmount: () => {
      el?.remove()
      el = null
      mediaEl = null
    }
  }
}
