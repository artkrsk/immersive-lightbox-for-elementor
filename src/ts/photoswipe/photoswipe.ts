import {
  createElement,
  equalizePoints,
  pointsEqual,
  clamp,
} from './util/util';

import DOMEvents from './util/dom-events';
import Slide from './slide/slide';
import Gestures from './gestures/gestures';
import MainScroll from './main-scroll';

import Keyboard from './keyboard';
import Animations from './util/animations';
import ScrollWheel from './scroll-wheel';
import UI from './ui/ui';
import { getViewportSize } from './util/viewport-size';
import { getThumbBounds } from './slide/get-thumb-bounds';
import PhotoSwipeBase from './core/base';
import Opener from './opener';
import ContentLoader from './slide/loader';
import type { Bounds } from './slide/get-thumb-bounds';
import type { ItemHolder } from './main-scroll';
import type { SlideData } from './slide/slide';
import type { PhotoSwipeOptions, Point, PreparedPhotoSwipeOptions } from './types';

/* The types module is the canonical home of the options/geometry surface —
   re-exported here so consumers keep their photoswipe.js import path. */
export type {
  ActionFn,
  ActionType,
  DataSource,
  DataSourceArray,
  DataSourceObject,
  ElementProvider,
  Padding,
  PhotoSwipeModule,
  PhotoSwipeModuleOption,
  PhotoSwipeOptions,
  Point,
  PreparedPhotoSwipeOptions
} from './types';
export type { SlideData } from './slide/slide';

const defaultOptions: PreparedPhotoSwipeOptions = {
  allowPanToNext: true,
  spacing: 0.1,
  loop: true,
  pinchToClose: true,
  closeOnVerticalDrag: true,
  hideAnimationDuration: 333,
  showAnimationDuration: 333,
  zoomAnimationDuration: 333,
  escKey: true,
  arrowKeys: true,
  trapFocus: true,
  returnFocus: true,
  maxWidthToAnimate: 4000,
  clickToCloseNonZoomable: true,
  imageClickAction: 'zoom-or-close',
  bgClickAction: 'close',
  tapAction: 'toggle-controls',
  doubleTapAction: 'zoom',
  indexIndicatorSep: ' / ',
  preloaderDelay: 2000,
  bgOpacity: 0.8,

  index: 0,
  errorMsg: 'The image cannot be loaded',
  preload: [1, 2],
  easing: 'cubic-bezier(.4,0,.22,1)'
};

/**
 * PhotoSwipe Core
 */
class PhotoSwipe extends PhotoSwipeBase {
  declare options: PreparedPhotoSwipeOptions;
  declare offset: Point;
  declare viewportSize: Point;
  declare bgOpacity: number;
  declare currIndex: number;
  declare potentialIndex: number;
  declare isOpen: boolean;
  declare isDestroying: boolean;
  declare hasMouse: boolean;
  declare topBar: HTMLDivElement | undefined;
  declare element: HTMLDivElement | undefined;
  declare template: HTMLDivElement | undefined;
  declare container: HTMLDivElement | undefined;
  declare scrollWrap: HTMLElement | undefined;
  declare currSlide: Slide | undefined;
  declare events: DOMEvents;
  declare animations: Animations;
  declare mainScroll: MainScroll;
  declare gestures: Gestures;
  declare opener: Opener;
  declare keyboard: Keyboard;
  declare contentLoader: ContentLoader;
  declare scrollWheel: ScrollWheel | undefined;
  declare ui: UI | undefined;
  declare bg: HTMLDivElement | undefined;
  declare private _prevViewportSize: Point;
  declare private _initialItemData: SlideData;
  declare _initialThumbBounds: Bounds | undefined;

  constructor(options?: PhotoSwipeOptions) {
    super();

    this.options = this._prepareOptions(options || {});

    /**
     * offset of viewport relative to document
     */
    this.offset = { x: 0, y: 0 };

    this._prevViewportSize = { x: 0, y: 0 };

    /**
     * Size of scrollable PhotoSwipe viewport
     */
    this.viewportSize = { x: 0, y: 0 };

    /**
     * background (backdrop) opacity
     */
    this.bgOpacity = 1;
    this.currIndex = 0;
    this.potentialIndex = 0;
    this.isOpen = false;
    this.isDestroying = false;
    this.hasMouse = false;

    this._initialItemData = {};
    this._initialThumbBounds = undefined;

    this.topBar = undefined;
    this.element = undefined;
    this.template = undefined;
    this.container = undefined;
    this.scrollWrap = undefined;
    this.currSlide = undefined;

    this.events = new DOMEvents();
    this.animations = new Animations();
    this.mainScroll = new MainScroll(this);
    this.gestures = new Gestures(this);
    this.opener = new Opener(this);
    this.keyboard = new Keyboard(this);
    this.contentLoader = new ContentLoader(this);
  }

  init(): boolean {
    if (this.isOpen || this.isDestroying) {
      return false;
    }

    this.isOpen = true;
    this.dispatch('init'); // legacy
    this.dispatch('beforeOpen');

    this._createMainStructure();

    // add classes to the root element of PhotoSwipe
    let rootClasses = 'pswp--open';
    if (this.gestures.supportsTouch) {
      rootClasses += ' pswp--touch';
    }
    if (this.options.mainClass) {
      rootClasses += ' ' + this.options.mainClass;
    }
    if (this.element) {
      this.element.className += ' ' + rootClasses;
    }

    this.currIndex = this.options.index || 0;
    this.potentialIndex = this.currIndex;
    this.dispatch('firstUpdate'); // starting index can be modified here

    // initialize scroll wheel handler to block the scroll
    this.scrollWheel = new ScrollWheel(this);

    // sanitize index
    if (Number.isNaN(this.currIndex)
        || this.currIndex < 0
        || this.currIndex >= this.getNumItems()) {
      this.currIndex = 0;
    }

    if (!this.gestures.supportsTouch) {
      // enable mouse features if no touch support detected
      this.mouseDetected();
    }

    // causes forced synchronous layout
    this.updateSize();

    this.offset.y = window.pageYOffset;

    this._initialItemData = this.getItemData(this.currIndex);
    this.dispatch('gettingData', {
      index: this.currIndex,
      data: this._initialItemData,
      slide: undefined
    });

    // *Layout* - calculate size and position of elements here
    this._initialThumbBounds = this.getThumbBounds();
    this.dispatch('initialLayout');

    this.on('openingAnimationEnd', () => {
      const { itemHolders } = this.mainScroll;

      // Add content to the previous and next slide
      if (itemHolders[0]) {
        itemHolders[0].el.style.display = 'block';
        this.setContent(itemHolders[0], this.currIndex - 1);
      }
      if (itemHolders[2]) {
        itemHolders[2].el.style.display = 'block';
        this.setContent(itemHolders[2], this.currIndex + 1);
      }

      this.appendHeavy();

      this.contentLoader.updateLazy();

      this.events.add(window, 'resize', this._handlePageResize.bind(this));
      this.events.add(window, 'scroll', this._updatePageScrollOffset.bind(this));
      this.dispatch('bindEvents');
    });

    // set content for center slide (first time)
    if (this.mainScroll.itemHolders[1]) {
      this.setContent(this.mainScroll.itemHolders[1], this.currIndex);
    }
    this.dispatch('change');

    this.opener.open();

    this.dispatch('afterInit');

    return true;
  }

  /**
   * Get looped slide index
   * (for example, -1 will return the last slide)
   */
  getLoopedIndex(index: number): number {
    const numSlides = this.getNumItems();

    if (this.options.loop) {
      if (index > numSlides - 1) {
        index -= numSlides;
      }

      if (index < 0) {
        index += numSlides;
      }
    }

    return clamp(index, 0, numSlides - 1);
  }

  appendHeavy(): void {
    this.mainScroll.itemHolders.forEach((itemHolder) => {
      itemHolder.slide?.appendHeavy();
    });
  }

  /**
   * Change the slide
   * @param index New index
   */
  goTo(index: number): void {
    this.mainScroll.moveIndexBy(
      this.getLoopedIndex(index) - this.potentialIndex
    );
  }

  /**
   * Go to the next slide.
   */
  next(): void {
    this.goTo(this.potentialIndex + 1);
  }

  /**
   * Go to the previous slide.
   */
  prev(): void {
    this.goTo(this.potentialIndex - 1);
  }

  /**
   * @see slide/slide.ts zoomTo
   */
  zoomTo(...args: Parameters<Slide['zoomTo']>): void {
    this.currSlide?.zoomTo(...args);
  }

  /**
   * @see slide/slide.ts toggleZoom
   */
  toggleZoom(): void {
    this.currSlide?.toggleZoom();
  }

  /**
   * Close the gallery.
   * After closing transition ends - destroy it
   */
  close(): void {
    if (!this.opener.isOpen || this.isDestroying) {
      return;
    }

    this.isDestroying = true;

    this.dispatch('close');

    this.events.removeAll();
    this.opener.close();
  }

  /**
   * Destroys the gallery:
   * - instantly closes the gallery
   * - unbinds events,
   * - cleans intervals and timeouts
   * - removes elements from DOM
   */
  destroy(): void {
    if (!this.isDestroying) {
      this.options.showHideAnimationType = 'none';
      this.close();
      return;
    }

    this.dispatch('destroy');

    this._listeners = {};

    if (this.scrollWrap) {
      this.scrollWrap.ontouchmove = null;
      this.scrollWrap.ontouchend = null;
    }

    this.element?.remove();

    this.mainScroll.itemHolders.forEach((itemHolder) => {
      itemHolder.slide?.destroy();
    });

    this.contentLoader.destroy();
    this.events.removeAll();
  }

  /**
   * Refresh/reload content of a slide by its index
   */
  refreshSlideContent(slideIndex: number): void {
    this.contentLoader.removeByIndex(slideIndex);
    this.mainScroll.itemHolders.forEach((itemHolder, i) => {
      let potentialHolderIndex = (this.currSlide?.index ?? 0) - 1 + i;
      if (this.canLoop()) {
        potentialHolderIndex = this.getLoopedIndex(potentialHolderIndex);
      }
      if (potentialHolderIndex === slideIndex) {
        // set the new slide content
        this.setContent(itemHolder, slideIndex, true);

        // activate the new slide if it's current
        if (i === 1) {
          this.currSlide = itemHolder.slide;
          itemHolder.slide?.setIsActive(true);
        }
      }
    });

    this.dispatch('change');
  }


  /**
   * Set slide content
   *
   * @param holder mainScroll.itemHolders array item
   * @param index Slide index
   * @param force If content should be set even if index wasn't changed
   */
  setContent(holder: ItemHolder, index: number, force?: boolean): void {
    if (this.canLoop()) {
      index = this.getLoopedIndex(index);
    }

    if (holder.slide) {
      if (holder.slide.index === index && !force) {
        // exit if holder already contains this slide
        // this could be common when just three slides are used
        return;
      }

      // destroy previous slide
      holder.slide.destroy();
      holder.slide = undefined;
    }

    // exit if no loop and index is out of bounds
    if (!this.canLoop() && (index < 0 || index >= this.getNumItems())) {
      return;
    }

    const itemData = this.getItemData(index);
    holder.slide = new Slide(itemData, index, this);

    // set current slide
    if (index === this.currIndex) {
      this.currSlide = holder.slide;
    }

    holder.slide.append(holder.el);
  }

  getViewportCenterPoint(): Point {
    return {
      x: this.viewportSize.x / 2,
      y: this.viewportSize.y / 2
    };
  }

  /**
   * Update size of all elements.
   * Executed on init and on page resize.
   *
   * @param force Update size even if size of viewport was not changed.
   */
  updateSize(force?: boolean): void {
    // let item;
    // let itemIndex;

    if (this.isDestroying) {
      // exit if PhotoSwipe is closed or closing
      // (to avoid errors, as resize event might be delayed)
      return;
    }

    //const newWidth = this.scrollWrap.clientWidth;
    //const newHeight = this.scrollWrap.clientHeight;

    const newViewportSize = getViewportSize(this.options, this);

    if (!force && pointsEqual(newViewportSize, this._prevViewportSize)) {
      // Exit if dimensions were not changed
      return;
    }

    //this._prevViewportSize.x = newWidth;
    //this._prevViewportSize.y = newHeight;
    equalizePoints(this._prevViewportSize, newViewportSize);

    this.dispatch('beforeResize');

    equalizePoints(this.viewportSize, this._prevViewportSize);

    this._updatePageScrollOffset();

    this.dispatch('viewportSize');

    // Resize slides only after opener animation is finished
    // and don't re-calculate size on inital size update
    this.mainScroll.resize(this.opener.isOpen);

    if (!this.hasMouse && window.matchMedia('(any-hover: hover)').matches) {
      this.mouseDetected();
    }

    this.dispatch('resize');
  }

  applyBgOpacity(opacity: number): void {
    this.bgOpacity = Math.max(opacity, 0);
    if (this.bg) {
      this.bg.style.opacity = String(this.bgOpacity * this.options.bgOpacity);
    }
  }

  /**
   * Whether mouse is detected
   */
  mouseDetected(): void {
    if (!this.hasMouse) {
      this.hasMouse = true;
      this.element?.classList.add('pswp--has_mouse');
    }
  }

  /**
   * Page resize event handler
   */
  private _handlePageResize(): void {
    this.updateSize();

    // In iOS webview, if element size depends on document size,
    // it'll be measured incorrectly in resize event
    //
    // https://bugs.webkit.org/show_bug.cgi?id=170595
    // https://hackernoon.com/onresize-event-broken-in-mobile-safari-d8469027bf4d
    if (/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) {
      setTimeout(() => {
        this.updateSize();
      }, 500);
    }
  }

  /**
   * Page scroll offset is used
   * to get correct coordinates
   * relative to PhotoSwipe viewport.
   */
  private _updatePageScrollOffset(): void {
    this.setScrollOffset(0, window.pageYOffset);
  }

  setScrollOffset(x: number, y: number): void {
    this.offset.x = x;
    this.offset.y = y;
    this.dispatch('updateScrollOffset');
  }

  /**
   * Create main HTML structure of PhotoSwipe,
   * and add it to DOM
   */
  private _createMainStructure(): void {
    // root DOM element of PhotoSwipe (.pswp)
    this.element = createElement('pswp', 'div');
    this.element.setAttribute('tabindex', '-1');
    this.element.setAttribute('role', 'dialog');

    // template is legacy prop
    this.template = this.element;

    // Background is added as a separate element,
    // as animating opacity is faster than animating rgba()
    this.bg = createElement('pswp__bg', 'div', this.element);
    this.scrollWrap = createElement('pswp__scroll-wrap', 'section', this.element);
    this.container = createElement('pswp__container', 'div', this.scrollWrap);

    // aria pattern: carousel
    this.scrollWrap.setAttribute('aria-roledescription', 'carousel');
    this.container.setAttribute('aria-live', 'off');
    this.container.setAttribute('id', 'pswp__items');

    this.mainScroll.appendHolders();

    this.ui = new UI(this);
    this.ui.init();

    // append to DOM
    (this.options.appendToEl || document.body).appendChild(this.element);
  }


  /**
   * Get position and dimensions of small thumbnail
   *   {x:,y:,w:}
   *
   * Height is optional (calculated based on the large image)
   */
  getThumbBounds(): Bounds | undefined {
    return getThumbBounds(
      this.currIndex,
      this.currSlide ? this.currSlide.data : this._initialItemData,
      this
    );
  }

  /**
   * If the PhotoSwipe can have continuous loop
   */
  canLoop(): boolean {
    return (this.options.loop && this.getNumItems() > 2);
  }

  private _prepareOptions(options: PhotoSwipeOptions): PreparedPhotoSwipeOptions {
    if (window.matchMedia('(prefers-reduced-motion), (update: slow)').matches) {
      options.showHideAnimationType = 'none';
      options.zoomAnimationDuration = 0;
    }

    return {
      ...defaultOptions,
      ...options
    };
  }
}

export default PhotoSwipe;
