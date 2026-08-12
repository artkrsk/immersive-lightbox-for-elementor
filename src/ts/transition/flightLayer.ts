import type { IFlightFrame, IFlightLayer } from '../interfaces'
import { snapshotVideoFrame } from './snapshotVideoFrame'

const LAYER_CLASS = 'arts-lightbox-flight'
const MEDIA_CLASS = 'arts-lightbox-flight__media'

/** What the flight carries: a fresh img clone, or a LIVE element (an
 *  adopted video keeps playing while it flies). */
export type TFlightMedia = { kind: 'img'; src: string } | { kind: 'element'; el: HTMLElement }

export function createFlightLayer(): IFlightLayer {
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
    freeze: () => {
      if (!el || owned || !(mediaEl instanceof HTMLVideoElement)) {
        return
      }
      const canvas = snapshotVideoFrame(mediaEl)
      if (!canvas) {
        return // no snapshot, no cover — degrades to the bare reparent
      }
      canvas.className = MEDIA_CLASS
      canvas.style.height = mediaEl.style.height
      canvas.style.transform = mediaEl.style.transform
      el.appendChild(canvas)
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
