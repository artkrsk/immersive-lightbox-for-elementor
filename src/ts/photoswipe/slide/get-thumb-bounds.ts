import type PhotoSwipe from '../photoswipe';
import type { SlideData } from './slide';

export interface Bounds {
  x: number;
  y: number;
  w: number;
  innerRect?: { w: number; h: number; x: number; y: number };
}

function getBoundsByElement(el: HTMLElement): Bounds {
  const thumbAreaRect = el.getBoundingClientRect();
  return {
    x: thumbAreaRect.left,
    y: thumbAreaRect.top,
    w: thumbAreaRect.width
  };
}

function getCroppedBoundsByElement(
  el: HTMLElement,
  imageWidth: number,
  imageHeight: number
): Bounds {
  const thumbAreaRect = el.getBoundingClientRect();

  // fill image into the area
  // (do they same as object-fit:cover does to retrieve coordinates)
  const hRatio = thumbAreaRect.width / imageWidth;
  const vRatio = thumbAreaRect.height / imageHeight;
  const fillZoomLevel = hRatio > vRatio ? hRatio : vRatio;

  const offsetX = (thumbAreaRect.width - imageWidth * fillZoomLevel) / 2;
  const offsetY = (thumbAreaRect.height - imageHeight * fillZoomLevel) / 2;

  /**
   * Coordinates of the image,
   * as if it was not cropped,
   * height is calculated automatically
   */
  const bounds: Bounds = {
    x: thumbAreaRect.left + offsetX,
    y: thumbAreaRect.top + offsetY,
    w: imageWidth * fillZoomLevel
  };

  // Coordinates of inner crop area
  // relative to the image
  bounds.innerRect = {
    w: thumbAreaRect.width,
    h: thumbAreaRect.height,
    x: offsetX,
    y: offsetY
  };

  return bounds;
}

/**
 * Get dimensions of thumbnail image
 * (click on which opens photoswipe or closes photoswipe to)
 *
 * @param index
 * @param itemData
 * @param instance PhotoSwipe instance
 */
export function getThumbBounds(
  index: number,
  itemData: SlideData,
  instance: PhotoSwipe
): Bounds | undefined {
  // legacy event, before filters were introduced
  const event = instance.dispatch('thumbBounds', {
    index,
    itemData,
    instance
  });
  // @ts-expect-error
  if (event.thumbBounds) {
    // @ts-expect-error
    return event.thumbBounds;
  }

  const { element } = itemData;
  let thumbBounds: Bounds | undefined;
  let thumbnail: HTMLElement | null | undefined;

  if (element && instance.options.thumbSelector !== false) {
    const thumbSelector = instance.options.thumbSelector || 'img';
    thumbnail = element.matches(thumbSelector)
      ? element : (element.querySelector(thumbSelector) as HTMLElement | null);
  }

  thumbnail = instance.applyFilters('thumbEl', thumbnail, itemData, index);

  if (thumbnail) {
    if (!itemData.thumbCropped) {
      thumbBounds = getBoundsByElement(thumbnail);
    } else {
      thumbBounds = getCroppedBoundsByElement(
        thumbnail,
        itemData.width || itemData.w || 0,
        itemData.height || itemData.h || 0
      );
    }
  }

  return instance.applyFilters('thumbBounds', thumbBounds, itemData, index);
}
