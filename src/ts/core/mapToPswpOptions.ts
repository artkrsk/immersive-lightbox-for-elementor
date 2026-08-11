import type { PhotoSwipeOptions, SlideData } from 'photoswipe'
import type { IGallery, IOptions, ISlideData } from '../interfaces'

function toPswpSlide(slide: ISlideData): SlideData {
  // ISlideData is a field-compatible superset of PhotoSwipe's SlideData
  // (src/width/height/msrc/type match by name); custom fields ride along for
  // the content modules and UI.
  return { ...slide, alt: slide.caption ?? '' }
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
    close: false
  }
}
