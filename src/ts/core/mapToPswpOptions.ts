import type { IGallery, IOptions, ISlideData } from '../interfaces'
import type { PhotoSwipeOptions, SlideData } from '../photoswipe/photoswipe.js'

function toPswpSlide(slide: ISlideData): SlideData {
  // ISlideData is a field-compatible superset of PhotoSwipe's SlideData
  // (src/width/height/msrc/type match by name); custom fields ride along for
  // the content modules and UI.
  const mapped: SlideData = { ...slide, alt: slide.caption ?? '' }
  // PhotoSwipe centers content from slide dimensions — zeros break its math.
  // Video/html slides rarely declare dims; give them a sane box (video gets
  // aspect-fit by the content module on top).
  if (!mapped.width || !mapped.height) {
    if (slide.type === 'video') {
      mapped.width = 1280
      mapped.height = 720
    } else if (slide.type === 'html') {
      mapped.width = 900
      mapped.height = 600
    }
  }
  // Dims guessed from thumb attributes carry the right ASPECT but a tiny
  // scale, and PhotoSwipe's fit/fill never upscale past "natural" — the
  // slide would first render at thumb size and snap once the load-complete
  // upgrade lands. Scaling the guess up makes the initial layout correct
  // from the first frame (fit depends only on aspect); the upgrade then
  // only corrects the zoom caps, invisibly.
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
  const options: PhotoSwipeOptions & { artsMouseDragNavigates: boolean } = {
    dataSource: gallery.slides.map(toPswpSlide),
    index,
    showHideAnimationType: 'none',
    bgOpacity: 0,
    imageClickAction: opts.zoom.imageClickAction === 'none' ? false : opts.zoom.imageClickAction,
    wheelToZoom: opts.zoom.wheelToZoom,
    // 'fill' opens already zoomed to cover AND is the zoom ceiling: click
    // toggles OUT to fit and back, nothing zooms past fill (wheel/pinch
    // clamp to max). 'fit' keeps the classic stock levels.
    initialZoomLevel: opts.zoom.initialLevel,
    ...(opts.zoom.initialLevel === 'fill'
      ? { secondaryZoomLevel: 'fit' as const, maxZoomLevel: 'fill' as const }
      : {}),
    // Fork policy flag: with mousemove-pan active, mouse drags navigate
    // slides instead of panning (see photoswipe/gestures/drag-handler.js).
    artsMouseDragNavigates: opts.explore.enabled,
    loop: opts.gallery.loop,
    counter: false,
    zoom: false,
    arrowPrev: false,
    arrowNext: false,
    close: false,
    // Every close path must run OUR choreography — PhotoSwipe's own close is
    // instant (opener disabled). Esc and backdrop clicks are re-routed by the
    // composition root; drag/pinch closes are off until the playground phase
    // finds a choreography for them.
    escKey: false,
    arrowKeys: false,
    bgClickAction: false,
    closeOnVerticalDrag: false,
    pinchToClose: false
  }
  return options
}
