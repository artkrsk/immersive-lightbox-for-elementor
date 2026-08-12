import type { IFlightFrame, IFlightLayer } from '../interfaces'
import { createFlightMedia } from './createFlightMedia'
import { flightFrameStyles } from './flightFrameStyles'
import { snapshotVideoFrame } from './snapshotVideoFrame'

const LAYER_CLASS = 'arts-lightbox-flight'
const MEDIA_CLASS = 'arts-lightbox-flight__media'

export function createFlightLayer(): IFlightLayer {
  let el: HTMLDivElement | null = null
  let mediaEl: HTMLElement | null = null
  let owned = false // img clones are ours to destroy; live elements are not

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
      const inner = createFlightMedia(media)
      mediaEl = inner.el
      owned = inner.owned
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
