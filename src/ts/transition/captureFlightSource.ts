import type { IFlightSource } from '../interfaces'

/**
 * Captures the clicked element's visual state for the flight. Parallax is
 * measured geometrically — inner img rect vs frame rect — so it works for
 * any parallax mechanism without parsing transforms.
 */
export function captureFlightSource(sourceEl: HTMLElement): IFlightSource {
  const frameRect = sourceEl.getBoundingClientRect()
  const img = sourceEl.querySelector('img')
  const radius = Number.parseFloat(getComputedStyle(sourceEl).borderRadius) || 0
  const source: IFlightSource = {
    rect: { x: frameRect.left, y: frameRect.top, w: frameRect.width, h: frameRect.height },
    radius,
    innerHeightPct: 100,
    innerOffsetYPct: 0,
    src: img?.currentSrc || img?.getAttribute('src') || ''
  }
  if (img && frameRect.height > 0) {
    const imgRect = img.getBoundingClientRect()
    if (imgRect.height > 0) {
      source.innerHeightPct = (imgRect.height / frameRect.height) * 100
      source.innerOffsetYPct = ((imgRect.top - frameRect.top) / frameRect.height) * 100
    }
  }
  return source
}
