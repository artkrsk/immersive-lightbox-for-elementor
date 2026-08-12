import type PhotoSwipeBase from './core/base'
import type PhotoSwipe from './photoswipe'
import type { Bounds } from './slide/get-thumb-bounds'
import type { SlideData } from './slide/slide'
import type { ZoomLevelOption } from './slide/zoom-level'

export type Methods<T> = { [M in keyof T]: T[M] extends (...a: any) => any ? M : never }[keyof T]

export type AddPostfix<T extends string, P extends string> = `${T}${P}`

export interface Type<T> extends Function {
  new (...args: any[]): T
}

export interface Point {
  x: number
  y: number
  id?: string | number
}

export interface Padding {
  top: number
  bottom: number
  left: number
  right: number
}

export type DataSourceArray = SlideData[]

export interface DataSourceObject {
  gallery: HTMLElement
  items?: HTMLElement[]
}

export type DataSource = DataSourceArray | DataSourceObject

export type ActionFn = (point: Point, originalEvent: PointerEvent) => void

export type ActionType = 'close' | 'next' | 'zoom' | 'zoom-or-close' | 'toggle-controls'

export type PhotoSwipeModule = Type<PhotoSwipe> | { default: Type<PhotoSwipe> }

export type PhotoSwipeModuleOption =
  | PhotoSwipeModule
  | Promise<PhotoSwipeModule>
  | (() => Promise<PhotoSwipeModule>)

export type ElementProvider = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement

/** https://photoswipe.com/options/ */
export type PhotoSwipeOptions = Partial<PreparedPhotoSwipeOptions>

export interface PreparedPhotoSwipeOptions {
  /**
   * Pass an array of any items via dataSource option. Its length will determine amount of slides
   * (which may be modified further from numItems event).
   *
   * Each item should contain data that you need to generate slide
   * (for image slide it would be src (image URL), width (image width), height, srcset, alt).
   *
   * If these properties are not present in your initial array, you may "pre-parse" each item from itemData filter.
   */
  dataSource?: DataSource

  /** Background backdrop opacity, always define it via this option and not via CSS rgba color. */
  bgOpacity: number

  /** Spacing between slides. Defined as ratio relative to the viewport width (0.1 = 10% of viewport). */
  spacing: number

  /** Allow swipe navigation to the next slide when the current slide is zoomed. Does not apply to mouse events. */
  allowPanToNext: boolean

  /**
   * If set to true you'll be able to swipe from the last to the first image.
   * Option is always false when there are less than 3 slides.
   */
  loop: boolean

  /** By default PhotoSwipe zooms image with ctrl-wheel, if you enable this option - image will zoom just via wheel. */
  wheelToZoom?: boolean

  /** Pinch touch gesture to close the gallery. */
  pinchToClose: boolean

  /** Vertical drag gesture to close the PhotoSwipe. */
  closeOnVerticalDrag: boolean

  /** Slide area padding (in pixels). */
  padding?: Padding

  /** The option is checked frequently, so make sure it's performant. Overrides padding option if defined. */
  paddingFn?: (viewportSize: Point, itemData: SlideData, index: number) => Padding

  /** Transition duration in milliseconds, can be 0. */
  hideAnimationDuration: number | false

  /** Transition duration in milliseconds, can be 0. */
  showAnimationDuration: number | false

  /** Transition duration in milliseconds, can be 0. */
  zoomAnimationDuration: number | false

  /** String, 'cubic-bezier(.4,0,.22,1)'. CSS easing function for open/close/zoom transitions. */
  easing: string

  /** Esc key to close. */
  escKey: boolean

  /** Left/right arrow keys for navigation. */
  arrowKeys: boolean

  /** Trap focus within PhotoSwipe element while it's open. */
  trapFocus: boolean

  /** Restore focus the last active element after PhotoSwipe is closed. */
  returnFocus: boolean

  /** If image is not zoomable (for example, smaller than viewport) it can be closed by clicking on it. */
  clickToCloseNonZoomable: boolean

  /** Refer to click and tap actions page. */
  imageClickAction: ActionType | ActionFn | false

  /** Refer to click and tap actions page. */
  bgClickAction: ActionType | ActionFn | false

  /** Refer to click and tap actions page. */
  tapAction: ActionType | ActionFn | false

  /** Refer to click and tap actions page. */
  doubleTapAction: ActionType | ActionFn | false

  /**
   * Delay before the loading indicator will be displayed,
   * if image is loaded during it - the indicator will not be displayed at all. Can be zero.
   */
  preloaderDelay: number

  /** Used for slide count indicator ("1 of 10 "). */
  indexIndicatorSep: string

  /** A function that should return slide viewport width and height, in format {x: 100, y: 100}. */
  getViewportSizeFn?: (options: PhotoSwipeOptions, pswp: PhotoSwipeBase) => Point

  /** Message to display when the image wasn't able to load. If you need to display HTML - use contentErrorElement filter. */
  errorMsg: string

  /**
   * Lazy loading of nearby slides based on direction of movement. Should be an array with two integers,
   * first one - number of items to preload before the current image, second one - after the current image.
   * Two nearby images are always loaded.
   */
  preload: [number, number]

  /**
   * Class that will be added to the root element of PhotoSwipe, may contain multiple separated by space.
   * Example on Styling page.
   */
  mainClass?: string

  /** Element to which PhotoSwipe dialog will be appended when it opens. */
  appendToEl?: HTMLElement

  /**
   * Maximum width of image to animate, if initial rendered image width
   * is larger than this value - the opening/closing transition will be automatically disabled.
   */
  maxWidthToAnimate: number

  /**
   * To adjust opening or closing transition type use lightbox option `showHideAnimationType` (`String`).
   * It supports three values - `zoom` (default), `fade` (default if there is no thumbnail) and `none`.
   *
   * Animations are automatically disabled if user `(prefers-reduced-motion: reduce)`.
   */
  showHideAnimationType?: 'zoom' | 'fade' | 'none'

  /** Defines start slide index. */
  index: number

  getClickedIndexFn?: (e: MouseEvent) => number

  arrowPrev?: boolean
  arrowNext?: boolean
  zoom?: boolean
  close?: boolean
  counter?: boolean

  arrowPrevSVG?: string
  arrowNextSVG?: string
  zoomSVG?: string
  closeSVG?: string
  counterSVG?: string

  arrowPrevTitle?: string
  arrowNextTitle?: string
  zoomTitle?: string
  closeTitle?: string
  counterTitle?: string

  initialZoomLevel?: ZoomLevelOption
  secondaryZoomLevel?: ZoomLevelOption
  maxZoomLevel?: ZoomLevelOption

  mouseMovePan?: boolean
  initialPointerPos?: Point | null
  showHideOpacity?: boolean

  pswpModule?: PhotoSwipeModuleOption
  openPromise?: () => Promise<any>
  preloadFirstSlide?: boolean
  gallery?: ElementProvider
  gallerySelector?: string
  children?: ElementProvider
  childSelector?: string
  thumbSelector?: string | false

  /**
   * @arts fork — a viewport-normalized pan seed (the click that opened the
   * lightbox): zoomAndPanToInitial honors it on every re-init until the
   * engine clears it. Written by the engine's explore mode.
   */
  artsSeedPan?: { x: number; y: number }

  /**
   * @arts fork — with mousemove-pan (explore) active, a mouse drag never
   * pans: horizontal drags move the main scroll, vertical drags do nothing.
   * See gestures/drag-handler.
   */
  artsMouseDragNavigates?: boolean
}

export type { SlideData, ZoomLevelOption }
