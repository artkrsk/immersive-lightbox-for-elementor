import type { IFlightSource } from '../interfaces'

/**
 * Captures the clicked element's visual state for the flight. Parallax is
 * measured geometrically — inner img rect vs frame rect — so it works for
 * any parallax mechanism without parsing transforms.
 */
export function captureFlightSource(sourceEl: HTMLElement): IFlightSource {
  const frameRect = sourceEl.getBoundingClientRect()
  const img = sourceEl.querySelector('img')
  const frameStyle = getComputedStyle(sourceEl)
  let radius = Number.parseFloat(frameStyle.borderRadius) || 0
  // The visible rounding may live on the inner img (plain grids) rather than
  // the frame (parallax cards). Fall back to it — unless the frame clips, in
  // which case the img's own corners are cut away and square is correct.
  // (Tested for clipping values, not 'visible': unset computes to '' in
  // happy-dom while browsers report 'visible'.)
  const frameClips = /hidden|clip|scroll|auto/.test(frameStyle.overflow)
  if (!radius && img && !frameClips) {
    radius = Number.parseFloat(getComputedStyle(img).borderRadius) || 0
  }
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
