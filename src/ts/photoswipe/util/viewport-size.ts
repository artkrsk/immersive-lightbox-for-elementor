import type PhotoSwipeBase from '../core/base.js';
import type { PhotoSwipeOptions, Point } from '../types.js';
import type { SlideData } from '../slide/slide.js';

export function getViewportSize(options: PhotoSwipeOptions, pswp: PhotoSwipeBase): Point {
  if (options.getViewportSizeFn) {
    const newViewportSize = options.getViewportSizeFn(options, pswp);
    if (newViewportSize) {
      return newViewportSize;
    }
  }

  return {
    x: document.documentElement.clientWidth,

    // TODO: height on mobile is very incosistent due to toolbar
    // find a way to improve this
    //
    // document.documentElement.clientHeight - doesn't seem to work well
    y: window.innerHeight
  };
}

/**
 * Parses padding option.
 * Supported formats:
 *
 * // Object
 * padding: {
 *  top: 0,
 *  bottom: 0,
 *  left: 0,
 *  right: 0
 * }
 *
 * // A function that returns the object
 * paddingFn: (viewportSize, itemData, index) => {
 *  return {
 *    top: 0,
 *    bottom: 0,
 *    left: 0,
 *    right: 0
 *  };
 * }
 *
 * // Legacy variant
 * paddingLeft: 0,
 * paddingRight: 0,
 * paddingTop: 0,
 * paddingBottom: 0,
 *
 * @param prop
 * @param options PhotoSwipe options
 * @param viewportSize PhotoSwipe viewport size, for example: { x:800, y:600 }
 * @param itemData Data about the slide
 * @param index Slide index
 */
export function parsePaddingOption(
  prop: 'left' | 'top' | 'bottom' | 'right',
  options: PhotoSwipeOptions,
  viewportSize: Point,
  itemData: SlideData,
  index: number
): number {
  let paddingValue = 0;

  if (options.paddingFn) {
    paddingValue = options.paddingFn(viewportSize, itemData, index)[prop];
  } else if (options.padding) {
    paddingValue = options.padding[prop];
  } else {
    const legacyPropName = 'padding' + prop[0]!.toUpperCase() + prop.slice(1);
    // @ts-expect-error
    if (options[legacyPropName]) {
      // @ts-expect-error
      paddingValue = options[legacyPropName];
    }
  }

  return Number(paddingValue) || 0;
}

export function getPanAreaSize(
  options: PhotoSwipeOptions,
  viewportSize: Point,
  itemData: SlideData,
  index: number
): Point {
  return {
    x: viewportSize.x
      - parsePaddingOption('left', options, viewportSize, itemData, index)
      - parsePaddingOption('right', options, viewportSize, itemData, index),
    y: viewportSize.y
      - parsePaddingOption('top', options, viewportSize, itemData, index)
      - parsePaddingOption('bottom', options, viewportSize, itemData, index)
  };
}
