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
  /** Element mode: overlay a snapshot of the video's current frame — a
   *  reparented <video> re-attaches its compositor texture and can present
   *  blank for a frame; the snapshot covers that gap. */
  freeze(): void
  unmount(): void
  /** Unmount after N painted frames — aborts if the layer was remounted
   *  meanwhile (an instant close can overlap the open's deferred cleanup). */
  unmountLater(frames: number): void
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
      if (!el || owned || !(mediaEl instanceof HTMLVideoElement) || mediaEl.readyState < 2) {
        return
      }
      const box = mediaEl.getBoundingClientRect()
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(box.width * devicePixelRatio)
      canvas.height = Math.round(box.height * devicePixelRatio)
      const ctx = canvas.getContext('2d')
      if (!ctx || !canvas.width || !canvas.height) {
        return
      }
      // Replicate object-fit: cover — scale the intrinsic frame to fill the
      // box, cropping the overflow around the center.
      const vw = mediaEl.videoWidth
      const vh = mediaEl.videoHeight
      const scale = Math.max(canvas.width / vw, canvas.height / vh)
      const sw = canvas.width / scale
      const sh = canvas.height / scale
      try {
        ctx.drawImage(
          mediaEl,
          (vw - sw) / 2,
          (vh - sh) / 2,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height
        )
      } catch {
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
