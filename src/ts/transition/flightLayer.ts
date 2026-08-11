import type { IFlightFrame } from '../interfaces'

const LAYER_CLASS = 'arts-lightbox-flight'

/**
 * The promoted element that travels above the curtain. A fixed-position
 * frame with overflow hidden; the inner img repaints from the interpolated
 * overscan/offset percentages each frame.
 */
export function createFlightLayer(): {
  mount(frame: IFlightFrame, src: string): void
  paint(frame: IFlightFrame): void
  unmount(): void
} {
  let el: HTMLDivElement | null = null
  let img: HTMLImageElement | null = null

  const paint = (frame: IFlightFrame): void => {
    if (!el || !img) {
      return
    }
    el.style.transform = `translate(${frame.x}px, ${frame.y}px)`
    el.style.width = `${frame.w}px`
    el.style.height = `${frame.h}px`
    el.style.borderRadius = `${frame.radius}px`
    img.style.height = `${frame.innerHeightPct}%`
    img.style.transform = `translateY(${(frame.innerOffsetYPct / frame.innerHeightPct) * 100}%)`
  }

  return {
    mount: (frame, src) => {
      if (el) {
        el.remove()
      }
      el = document.createElement('div')
      el.className = LAYER_CLASS
      img = document.createElement('img')
      img.alt = ''
      img.src = src
      el.appendChild(img)
      document.body.appendChild(el)
      paint(frame)
    },
    paint,
    unmount: () => {
      el?.remove()
      el = null
      img = null
    }
  }
}
