import type { PhotoSwipeOptions, SlideData } from 'photoswipe'
import type { IGallery, IOptions, ISlideData } from '../interfaces'

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
  return mapped
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
  return {
    dataSource: gallery.slides.map(toPswpSlide),
    index,
    showHideAnimationType: 'none',
    bgOpacity: 0,
    imageClickAction: opts.zoom.imageClickAction === 'none' ? false : opts.zoom.imageClickAction,
    wheelToZoom: opts.zoom.wheelToZoom,
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
}
