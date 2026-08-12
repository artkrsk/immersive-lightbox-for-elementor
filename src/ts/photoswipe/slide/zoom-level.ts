import type PhotoSwipe from '../photoswipe.js';
import type { PhotoSwipeOptions, Point } from '../types.js';
import type { SlideData } from './slide.js';

const MAX_IMAGE_WIDTH = 4000;

export type ZoomLevelOption = 'fit' | 'fill' | number | ((zoomLevelObject: ZoomLevel) => number);

/**
 * Calculates zoom levels for specific slide.
 * Depends on viewport size and image size.
 */
class ZoomLevel {
  declare pswp: PhotoSwipe | undefined;
  declare options: PhotoSwipeOptions;
  declare itemData: SlideData;
  declare index: number;
  declare panAreaSize: Point | null;
  declare elementSize: Point | null;
  declare fit: number;
  declare fill: number;
  declare vFill: number;
  declare initial: number;
  declare secondary: number;
  declare max: number;
  declare min: number;

  /**
   * @param options PhotoSwipe options
   * @param itemData Slide data
   * @param index Slide index
   * @param pswp PhotoSwipe instance, can be undefined if not initialized yet
   */
  constructor(options: PhotoSwipeOptions, itemData: SlideData, index: number, pswp?: PhotoSwipe) {
    this.pswp = pswp;
    this.options = options;
    this.itemData = itemData;
    this.index = index;
    this.panAreaSize = null;
    this.elementSize = null;
    this.fit = 1;
    this.fill = 1;
    this.vFill = 1;
    this.initial = 1;
    this.secondary = 1;
    this.max = 1;
    this.min = 1;
  }

  /**
   * Calculate initial, secondary and maximum zoom level for the specified slide.
   *
   * It should be called when either image or viewport size changes.
   */
  update(maxWidth: number, maxHeight: number, panAreaSize: Point): void {
    const elementSize: Point = { x: maxWidth, y: maxHeight };
    this.elementSize = elementSize;
    this.panAreaSize = panAreaSize;

    const hRatio = panAreaSize.x / elementSize.x;
    const vRatio = panAreaSize.y / elementSize.y;

    this.fit = Math.min(1, hRatio < vRatio ? hRatio : vRatio);
    this.fill = Math.min(1, hRatio > vRatio ? hRatio : vRatio);

    // zoom.vFill defines zoom level of the image
    // when it has 100% of viewport vertical space (height)
    this.vFill = Math.min(1, vRatio);

    this.initial = this._getInitial();
    this.secondary = this._getSecondary();
    this.max = Math.max(
      this.initial,
      this.secondary,
      this._getMax()
    );

    this.min = Math.min(
      this.fit,
      this.initial,
      this.secondary
    );

    if (this.pswp) {
      this.pswp.dispatch('zoomLevelsUpdate', { zoomLevels: this, slideData: this.itemData });
    }
  }

  /**
   * Parses user-defined zoom option.
   *
   * @param optionPrefix Zoom level option prefix (initial, secondary, max)
   */
  private _parseZoomLevelOption(optionPrefix: 'initial' | 'secondary' | 'max'): number | undefined {
    const optionName = (
      optionPrefix + 'ZoomLevel'
    ) as 'initialZoomLevel' | 'secondaryZoomLevel' | 'maxZoomLevel';
    const optionValue = this.options[optionName];

    if (!optionValue) {
      return;
    }

    if (typeof optionValue === 'function') {
      return optionValue(this);
    }

    if (optionValue === 'fill') {
      return this.fill;
    }

    if (optionValue === 'fit') {
      return this.fit;
    }

    return Number(optionValue);
  }

  /**
   * Get zoom level to which image will be zoomed after double-tap gesture,
   * or when user clicks on zoom icon,
   * or mouse-click on image itself.
   * If you return 1 image will be zoomed to its original size.
   */
  private _getSecondary(): number {
    let currZoomLevel = this._parseZoomLevelOption('secondary');

    if (currZoomLevel) {
      return currZoomLevel;
    }

    // 3x of "fit" state, but not larger than original
    currZoomLevel = Math.min(1, this.fit * 3);

    if (this.elementSize && currZoomLevel * this.elementSize.x > MAX_IMAGE_WIDTH) {
      currZoomLevel = MAX_IMAGE_WIDTH / this.elementSize.x;
    }

    return currZoomLevel;
  }

  /**
   * Get initial image zoom level.
   */
  private _getInitial(): number {
    return this._parseZoomLevelOption('initial') || this.fit;
  }

  /**
   * Maximum zoom level when user zooms
   * via zoom/pinch gesture,
   * via cmd/ctrl-wheel or via trackpad.
   */
  private _getMax(): number {
    // max zoom level is x4 from "fit state",
    // used for zoom gesture and ctrl/trackpad zoom
    return this._parseZoomLevelOption('max') || Math.max(1, this.fit * 4);
  }
}

export default ZoomLevel;
