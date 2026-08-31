import type { IGallery, IOptions, ISlideData } from '../interfaces'
import type { PhotoSwipeOptions, SlideData } from '../photoswipe/photoswipe'
import type ZoomLevel from '../photoswipe/slide/zoom-level'
import { MAX_IMAGE_WIDTH } from '../photoswipe/slide/zoom-level'
import { measureAdminBarOffset } from '../utils/measureAdminBarOffset'

function toPswpSlide(slide: ISlideData): SlideData {
  // ISlideData is a field-compatible superset of PhotoSwipe's SlideData
  // (src/width/height/msrc/type match by name); custom fields ride along for
  // the content modules and UI.
  const mapped: SlideData = { ...slide, alt: slide.caption ?? '' }
  // PhotoSwipe centers content from slide dimensions — zeros break its math.
  // Video/html slides rarely declare dims; give them a sane box (video gets
  // aspect-fit by the content module on top). A dimension-less IMAGE slide
  // gets a square interim: wrong aspect for at most one cold load, corrected
  // by the loadComplete upgrade — undefined dims would stretch it forever.
  if (!mapped.width || !mapped.height) {
    if (slide.type === 'video') {
      mapped.width = 1280
      mapped.height = 720
    } else if (slide.type === 'html') {
      mapped.width = 900
      mapped.height = 600
    } else {
      mapped.width = GUESSED_DIMS_TARGET
      mapped.height = GUESSED_DIMS_TARGET
    }
  }
  // Dims guessed from thumb attributes carry the right ASPECT but a tiny
  // scale, and PhotoSwipe's fit/fill never upscale past "natural" — the
  // slide would otherwise render at thumb size until the upgrade lands.
  // Scaling the guess up trades that for the opposite error: an image whose
  // naturals are SMALLER than the viewport shows viewport-filling until the
  // upgrade, since only the truth hits the never-upscale cap. Hence the
  // upgrade has to reach a slide before its first paint (upgradeGuessedDims).
  if (slide.dimsGuessed && mapped.width && mapped.height) {
    const factor = GUESSED_DIMS_TARGET / Math.max(mapped.width, mapped.height)
    if (factor > 1) {
      mapped.width = Math.round(mapped.width * factor)
      mapped.height = Math.round(mapped.height * factor)
    }
  }
  return mapped
}

/** Long side guessed dims are normalized to — comfortably above any viewport. */
const GUESSED_DIMS_TARGET = 3200

/**
 * The three zoom levels, by mode. 'fill' opens already zoomed to cover AND
 * is the zoom ceiling: click toggles OUT to fit and back, nothing zooms
 * past fill (wheel/pinch clamp to max). 'fit' is the classic model with ONE
 * level read from the options, as a multiple of the fitted size: the click
 * lands there and pinch/wheel stop there — how far in zoom goes is one
 * question, whatever kicks it off. 'off' opens at fit; the zoom policy makes
 * every slide non-zoomable, so the other two levels never matter.
 */
function zoomLevels(
  zoom: IOptions['zoom']
): Pick<PhotoSwipeOptions, 'initialZoomLevel' | 'secondaryZoomLevel' | 'maxZoomLevel'> {
  if (zoom.mode === 'fill') {
    return { initialZoomLevel: 'fill', secondaryZoomLevel: 'fit', maxZoomLevel: 'fill' }
  }
  if (zoom.mode === 'off') {
    return { initialZoomLevel: 'fit' }
  }
  // Never past the image's own pixels, nor wider than the fork's own render
  // cap — both stock guards on the click, here applied to the pinch as well.
  // A small image whose fit already sits at natural therefore has no range
  // at all, and the cursor says so by offering nothing.
  const level = (z: ZoomLevel): number => {
    const capped = Math.min(z.fit * zoom.level, 1)
    return z.elementSize && capped * z.elementSize.x > MAX_IMAGE_WIDTH
      ? MAX_IMAGE_WIDTH / z.elementSize.x
      : capped
  }
  return { initialZoomLevel: 'fit', secondaryZoomLevel: level, maxZoomLevel: level }
}

/**
 * PhotoSwipe construction options from the engine options + a gallery.
 * Everything we replace is neutralized here: the opener runs with
 * `showHideAnimationType: 'none'`, the backdrop is ours (`bgOpacity: 0`),
 * and every stock UI element is suppressed in favor of our UI layer.
 */
export function mapToPswpOptions(
  opts: IOptions,
  gallery: IGallery,
  index: number
): PhotoSwipeOptions {
  const options: PhotoSwipeOptions = {
    dataSource: gallery.slides.map(toPswpSlide),
    index,
    showHideAnimationType: 'none',
    bgOpacity: 0,
    // Never the fork's 'zoom-or-close': a click on a slide with nothing to
    // toggle must be a no-op, not a dismissal. What a click toggles — and
    // whether anything does — is the mode's business (levels below, and the
    // zoom policy for 'off').
    imageClickAction: 'zoom',
    wheelToZoom: opts.zoom.wheelToZoom,
    ...zoomLevels(opts.zoom),
    // Fork policy flag: with mousemove-pan active, mouse drags navigate
    // slides instead of panning (see photoswipe/gestures/drag-handler.ts).
    artsMouseDragNavigates: opts.explore.enabled,
    // Slides center in the region the admin bar leaves visible — the bar
    // floats above the lightbox (z-drop in _lightbox.scss), and pswp
    // re-evaluates this on every updateSize, so resizes track for free.
    paddingFn: () => ({ top: measureAdminBarOffset(), bottom: 0, left: 0, right: 0 }),
    loop: opts.gallery.loop,
    counter: false,
    zoom: false,
    arrowPrev: false,
    arrowNext: false,
    close: false,
    // Every close path must run OUR choreography — PhotoSwipe's own close is
    // instant (opener disabled). Esc/arrows are re-routed by attachDelegation
    // and backdrop clicks by createOpener; drag/pinch closes stay off until a
    // touch-close choreography exists — revisit deliberately, not by flipping
    // the flag.
    escKey: false,
    arrowKeys: false,
    bgClickAction: false,
    closeOnVerticalDrag: false,
    pinchToClose: false
  }
  return options
}
