import { slideData } from '../content/slideData'
import type Slide from '../photoswipe/slide/slide'

const EPSILON = 0.001

/**
 * Whether zooming this slide would actually go anywhere — the one answer the
 * zoom mode, the click toggle and the cursor affordance all need, stated
 * once. Three ways it can be no:
 *
 * - the content type refuses (video, html — and everything under zoom mode
 *   'off', by way of the same policy filter);
 * - the dimensions are still guessed, so the range is fiction. A slide with
 *   no declared dims opens on an interim box big enough to look zoomable,
 *   and believing that is what made small images arrive covering the screen
 *   and snap once their naturals landed;
 * - the geometry collapsed: the fork caps fit AND fill at natural size, so
 *   an image smaller than the viewport has both at 1 and nowhere to go.
 *
 * The range is measured from fit to wherever a click lands — fill under
 * the fill model (it opens there), the click level under the fit model.
 * `max(initial, secondary)` names that without asking which model is on.
 */
export function canSlideZoom(slide: Slide): boolean {
  if (!slide.isZoomable() || slideData(slide).dimsGuessed) {
    return false
  }
  const { fit, initial, secondary } = slide.zoomLevels
  if (typeof fit !== 'number' || typeof initial !== 'number' || typeof secondary !== 'number') {
    return false
  }
  return Math.max(initial, secondary) - fit > EPSILON
}
