import type { IRect } from '../interfaces'

/**
 * Where PhotoSwipe will actually render the current slide: pan offset is the
 * top-left corner, zoom level scales the natural dimensions.
 */
export function computeSlideRect(slide: {
  pan: { x: number; y: number }
  currZoomLevel: number
  width: number
  height: number
}): IRect {
  return {
    x: slide.pan.x,
    y: slide.pan.y,
    w: slide.width * slide.currZoomLevel,
    h: slide.height * slide.currZoomLevel
  }
}
