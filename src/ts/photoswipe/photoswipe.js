import {
  createElement,
  equalizePoints,
  pointsEqual,
  clamp,
} from './util/util.js';

import DOMEvents from './util/dom-events.js';
import Slide from './slide/slide.js';
import Gestures from './gestures/gestures.js';
import MainScroll from './main-scroll.js';

import Keyboard from './keyboard.js';
import Animations from './util/animations.js';
import ScrollWheel from './scroll-wheel.js';
import UI from './ui/ui.js';
import { getViewportSize } from './util/viewport-size.js';
import { getThumbBounds } from './slide/get-thumb-bounds.js';
import PhotoSwipeBase from './core/base.js';
import Opener from './opener.js';
import ContentLoader from './slide/loader.js';

/**
 * @template T
 * @typedef {import('./types.js').Type<T>} Type<T>
 */

/** @typedef {import('./slide/slide.js').SlideData} SlideData */
/** @typedef {import('./slide/zoom-level.js').ZoomLevelOption} ZoomLevelOption */
/** @typedef {import('./ui/ui-element.js').UIElementData} UIElementData */
/** @typedef {import('./main-scroll.js').ItemHolder} ItemHolder */
/** @typedef {import('./core/eventable.js').PhotoSwipeEventsMap} PhotoSwipeEventsMap */
/** @typedef {import('./core/eventable.js').PhotoSwipeFiltersMap} PhotoSwipeFiltersMap */
/** @typedef {import('./slide/get-thumb-bounds').Bounds} Bounds */
/**
 * @template {keyof PhotoSwipeEventsMap} T
 * @typedef {import('./core/eventable.js').EventCallback<T>} EventCallback<T>
 */
/**
 * @template {keyof PhotoSwipeEventsMap} T
 * @typedef {import('./core/eventable.js').AugmentedEvent<T>} AugmentedEvent<T>
 */

/* Canonical definitions live in types.ts (the fork's types module); these
   re-export typedefs keep every existing `import('../photoswipe.js').X`
   alias across the fork working until each file's own conversion. */
/** @typedef {import('./types.js').Point} Point */
/** @typedef {import('./types.js').Padding} Padding */
/** @typedef {import('./types.js').DataSourceArray} DataSourceArray */
/** @typedef {import('./types.js').DataSourceObject} DataSourceObject */
/** @typedef {import('./types.js').DataSource} DataSource */
/** @typedef {import('./types.js').ActionFn} ActionFn */
/** @typedef {import('./types.js').ActionType} ActionType */
/** @typedef {import('./types.js').PhotoSwipeModule} PhotoSwipeModule */
/** @typedef {import('./types.js').PhotoSwipeModuleOption} PhotoSwipeModuleOption */
/** @typedef {import('./types.js').ElementProvider} ElementProvider */

/** @typedef {import('./types.js').PhotoSwipeOptions} PhotoSwipeOptions */
/** @typedef {import('./types.js').PreparedPhotoSwipeOptions} PreparedPhotoSwipeOptions */

/** @type {PreparedPhotoSwipeOptions} */
const defaultOptions = {
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
  /**
   * @param {PhotoSwipeOptions} [options]
   */
  constructor(options) {
    super();

    this.options = this._prepareOptions(options || {});

    /**
     * offset of viewport relative to document
     *
     * @type {Point}
     */
    this.offset = { x: 0, y: 0 };

    /**
     * @type {Point}
     * @private
     */
    this._prevViewportSize = { x: 0, y: 0 };

    /**
     * Size of scrollable PhotoSwipe viewport
     *
     * @type {Point}
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

    /**
     * @private
     * @type {SlideData}
     */
    this._initialItemData = {};
    /** @type {Bounds | undefined} */
    this._initialThumbBounds = undefined;

    /** @type {HTMLDivElement | undefined} */
    this.topBar = undefined;
    /** @type {HTMLDivElement | undefined} */
    this.element = undefined;
    /** @type {HTMLDivElement | undefined} */
    this.template = undefined;
    /** @type {HTMLDivElement | undefined} */
    this.container = undefined;
    /** @type {HTMLElement | undefined} */
    this.scrollWrap = undefined;
    /** @type {Slide | undefined} */
    this.currSlide = undefined;

    this.events = new DOMEvents();
    this.animations = new Animations();
    this.mainScroll = new MainScroll(this);
    this.gestures = new Gestures(this);
    this.opener = new Opener(this);
    this.keyboard = new Keyboard(this);
    this.contentLoader = new ContentLoader(this);
  }

  /** @returns {boolean} */
  init() {
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
   *
   * @param {number} index
   * @returns {number}
   */
  getLoopedIndex(index) {
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

  appendHeavy() {
    this.mainScroll.itemHolders.forEach((itemHolder) => {
      itemHolder.slide?.appendHeavy();
    });
  }

  /**
   * Change the slide
   * @param {number} index New index
   */
  goTo(index) {
    this.mainScroll.moveIndexBy(
      this.getLoopedIndex(index) - this.potentialIndex
    );
  }

  /**
   * Go to the next slide.
   */
  next() {
    this.goTo(this.potentialIndex + 1);
  }

  /**
   * Go to the previous slide.
   */
  prev() {
    this.goTo(this.potentialIndex - 1);
  }

  /**
   * @see slide/slide.js zoomTo
   *
   * @param {Parameters<Slide['zoomTo']>} args
   */
  zoomTo(...args) {
    this.currSlide?.zoomTo(...args);
  }

  /**
   * @see slide/slide.js toggleZoom
   */
  toggleZoom() {
    this.currSlide?.toggleZoom();
  }

  /**
   * Close the gallery.
   * After closing transition ends - destroy it
   */
  close() {
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
  destroy() {
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
   *
   * @param {number} slideIndex
   */
  refreshSlideContent(slideIndex) {
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
   * @param {ItemHolder} holder mainScroll.itemHolders array item
   * @param {number} index Slide index
   * @param {boolean} [force] If content should be set even if index wasn't changed
   */
  setContent(holder, index, force) {
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

  /** @returns {Point} */
  getViewportCenterPoint() {
    return {
      x: this.viewportSize.x / 2,
      y: this.viewportSize.y / 2
    };
  }

  /**
   * Update size of all elements.
   * Executed on init and on page resize.
   *
   * @param {boolean} [force] Update size even if size of viewport was not changed.
   */
  updateSize(force) {
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

  /**
   * @param {number} opacity
   */
  applyBgOpacity(opacity) {
    this.bgOpacity = Math.max(opacity, 0);
    if (this.bg) {
      this.bg.style.opacity = String(this.bgOpacity * this.options.bgOpacity);
    }
  }

  /**
   * Whether mouse is detected
   */
  mouseDetected() {
    if (!this.hasMouse) {
      this.hasMouse = true;
      this.element?.classList.add('pswp--has_mouse');
    }
  }

  /**
   * Page resize event handler
   *
   * @private
   */
  _handlePageResize() {
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
   *
   * @private
   */
  _updatePageScrollOffset() {
    this.setScrollOffset(0, window.pageYOffset);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  setScrollOffset(x, y) {
    this.offset.x = x;
    this.offset.y = y;
    this.dispatch('updateScrollOffset');
  }

  /**
   * Create main HTML structure of PhotoSwipe,
   * and add it to DOM
   *
   * @private
   */
  _createMainStructure() {
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
   *
   * @returns {Bounds | undefined}
   */
  getThumbBounds() {
    return getThumbBounds(
      this.currIndex,
      this.currSlide ? this.currSlide.data : this._initialItemData,
      this
    );
  }

  /**
   * If the PhotoSwipe can have continuous loop
   * @returns Boolean
   */
  canLoop() {
    return (this.options.loop && this.getNumItems() > 2);
  }

  /**
   * @private
   * @param {PhotoSwipeOptions} options
   * @returns {PreparedPhotoSwipeOptions}
   */
  _prepareOptions(options) {
    if (window.matchMedia('(prefers-reduced-motion), (update: slow)').matches) {
      options.showHideAnimationType = 'none';
      options.zoomAnimationDuration = 0;
    }

    /** @type {PreparedPhotoSwipeOptions} */
    return {
      ...defaultOptions,
      ...options
    };
  }
}

export default PhotoSwipe;
