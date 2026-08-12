import type PhotoSwipe from '../photoswipe'
import type ContentDefault from '../slide/content'
import type { Bounds } from '../slide/get-thumb-bounds'
import type Slide from '../slide/slide'
import type { SlideData } from '../slide/slide'
import type ZoomLevel from '../slide/zoom-level'
import type { DataSource, PhotoSwipeOptions } from '../types'
import type { UIElementData } from '../ui/ui-element'
import type PhotoSwipeBase from './base'

/**
 * Allow adding an arbitrary props to the Content
 * https://photoswipe.com/custom-content/#using-webp-image-format
 */
export type Content = ContentDefault & Record<string, any>

/** Click-action coordinates — both axes optional, unlike the global Point. */
interface Point {
  x?: number
  y?: number
}

/** https://photoswipe.com/events/ */
export interface PhotoSwipeEventsMap {
  // https://photoswipe.com/adding-ui-elements/
  uiRegister: undefined
  uiElementCreate: { data: UIElementData }

  // https://photoswipe.com/events/#initialization-events
  beforeOpen: undefined
  firstUpdate: undefined
  initialLayout: undefined
  change: undefined
  afterInit: undefined
  bindEvents: undefined

  // https://photoswipe.com/events/#opening-or-closing-transition-events
  openingAnimationStart: undefined
  openingAnimationEnd: undefined
  closingAnimationStart: undefined
  closingAnimationEnd: undefined

  // https://photoswipe.com/events/#closing-events
  close: undefined
  destroy: undefined

  // https://photoswipe.com/events/#pointer-and-gesture-events
  pointerDown: { originalEvent: PointerEvent }
  pointerMove: { originalEvent: PointerEvent }
  pointerUp: { originalEvent: PointerEvent }
  /** can be default prevented */
  pinchClose: { bgOpacity: number }
  /** can be default prevented */
  verticalDrag: { panY: number }

  // https://photoswipe.com/events/#slide-content-events
  contentInit: { content: Content }
  /** can be default prevented */
  contentLoad: { content: Content; isLazy: boolean }
  /** can be default prevented */
  contentLoadImage: { content: Content; isLazy: boolean }
  loadComplete: { content: Content; slide: Slide; isError?: boolean }
  loadError: { content: Content; slide: Slide }
  /** can be default prevented */
  contentResize: { content: Content; width: number; height: number }
  imageSizeChange: { content: Content; width: number; height: number; slide: Slide }
  /** can be default prevented */
  contentLazyLoad: { content: Content }
  /** can be default prevented */
  contentAppend: { content: Content }
  /** can be default prevented */
  contentActivate: { content: Content }
  /** can be default prevented */
  contentDeactivate: { content: Content }
  /** can be default prevented */
  contentRemove: { content: Content }
  /** can be default prevented */
  contentDestroy: { content: Content }

  // undocumented
  /** can be default prevented */
  imageClickAction: { point: Point; originalEvent: PointerEvent }
  /** can be default prevented */
  bgClickAction: { point: Point; originalEvent: PointerEvent }
  /** can be default prevented */
  tapAction: { point: Point; originalEvent: PointerEvent }
  /** can be default prevented */
  doubleTapAction: { point: Point; originalEvent: PointerEvent }

  /** can be default prevented */
  keydown: { originalEvent: KeyboardEvent }
  moveMainScroll: { x: number; dragging: boolean }
  firstZoomPan: { slide: Slide }
  gettingData: { slide: Slide | undefined; data: SlideData; index: number }
  beforeResize: undefined
  resize: undefined
  viewportSize: undefined
  updateScrollOffset: undefined
  slideInit: { slide: Slide }
  afterSetContent: { slide: Slide }
  slideLoad: { slide: Slide }
  /** can be default prevented */
  appendHeavy: { slide: Slide }
  appendHeavyContent: { slide: Slide }
  slideActivate: { slide: Slide }
  slideDeactivate: { slide: Slide }
  slideDestroy: { slide: Slide }
  beforeZoomTo: {
    destZoomLevel: number
    centerPoint: Point | undefined
    transitionDuration: number | false | undefined
  }
  zoomPanUpdate: { slide: Slide }
  initialZoomPan: { slide: Slide }
  calcSlideSize: { slide: Slide }
  resolutionChanged: undefined
  /** can be default prevented */
  wheel: { originalEvent: WheelEvent }
  /** can be default prevented */
  contentAppendImage: { content: Content }
  /** can be default prevented */
  lazyLoadSlide: { index: number; itemData: SlideData }
  lazyLoad: undefined
  calcBounds: { slide: Slide }
  zoomLevelsUpdate: { zoomLevels: ZoomLevel; slideData: SlideData }

  // legacy
  init: undefined
  initialZoomIn: undefined
  initialZoomOut: undefined
  initialZoomInEnd: undefined
  initialZoomOutEnd: undefined
  numItems: { dataSource: DataSource | undefined; numItems: number }
  itemData: { itemData: SlideData; index: number }
  thumbBounds: { index: number; itemData: SlideData; instance: PhotoSwipe }
}

/** https://photoswipe.com/filters/ */
export interface PhotoSwipeFiltersMap {
  /**
   * Modify the total amount of slides. Example on Data sources page.
   * https://photoswipe.com/filters/#numitems
   */
  numItems: (numItems: number, dataSource: DataSource | undefined) => number

  /**
   * Modify slide item data. Example on Data sources page.
   * https://photoswipe.com/filters/#itemdata
   */
  itemData: (itemData: SlideData, index: number) => SlideData

  /**
   * Modify item data when it's parsed from DOM element. Example on Data sources page.
   * https://photoswipe.com/filters/#domitemdata
   */
  domItemData: (itemData: SlideData, element: HTMLElement, linkEl: HTMLAnchorElement) => SlideData

  /**
   * Modify clicked gallery item index.
   * https://photoswipe.com/filters/#clickedindex
   */
  clickedIndex: (clickedIndex: number, e: MouseEvent, instance: PhotoSwipeBase) => number

  /**
   * Modify placeholder image source.
   * https://photoswipe.com/filters/#placeholdersrc
   */
  placeholderSrc: (placeholderSrc: string | false, content: Content) => string | false

  /**
   * Modify if the content is currently loading.
   * https://photoswipe.com/filters/#iscontentloading
   */
  isContentLoading: (isContentLoading: boolean, content: Content) => boolean

  /**
   * Modify if the content can be zoomed.
   * https://photoswipe.com/filters/#iscontentzoomable
   */
  isContentZoomable: (isContentZoomable: boolean, content: Content) => boolean

  /**
   * Modify if the placeholder should be used for the content.
   * https://photoswipe.com/filters/#usecontentplaceholder
   */
  useContentPlaceholder: (useContentPlaceholder: boolean, content: Content) => boolean

  /**
   * Modify if the placeholder should be kept after the content is loaded.
   * https://photoswipe.com/filters/#iskeepingplaceholder
   */
  isKeepingPlaceholder: (isKeepingPlaceholder: boolean, content: Content) => boolean

  /**
   * Modify an element when the content has error state (for example, if image cannot be loaded).
   * https://photoswipe.com/filters/#contenterrorelement
   */
  contentErrorElement: (contentErrorElement: HTMLElement, content: Content) => HTMLElement

  /**
   * Modify a UI element that's being created.
   * https://photoswipe.com/filters/#uielement
   */
  uiElement: (element: HTMLElement, data: UIElementData) => HTMLElement

  /**
   * Modify the thumbnail element from which opening zoom animation starts or ends.
   * https://photoswipe.com/filters/#thumbel
   */
  thumbEl: (
    thumbnail: HTMLElement | null | undefined,
    itemData: SlideData,
    index: number
  ) => HTMLElement

  /**
   * Modify the thumbnail bounds from which opening zoom animation starts or ends.
   * https://photoswipe.com/filters/#thumbbounds
   */
  thumbBounds: (thumbBounds: Bounds | undefined, itemData: SlideData, index: number) => Bounds

  srcsetSizesWidth: (srcsetSizesWidth: number, content: Content) => number

  preventPointerEvent: (
    preventPointerEvent: boolean,
    event: PointerEvent,
    pointerType: string
  ) => boolean
}

export interface Filter<T extends keyof PhotoSwipeFiltersMap> {
  fn: PhotoSwipeFiltersMap[T]
  priority: number
}

export type AugmentedEvent<T extends keyof PhotoSwipeEventsMap> =
  PhotoSwipeEventsMap[T] extends undefined
    ? PhotoSwipeEvent<T>
    : PhotoSwipeEvent<T> & PhotoSwipeEventsMap[T]

export type EventCallback<T extends keyof PhotoSwipeEventsMap> = (event: AugmentedEvent<T>) => void

/**
 * Base PhotoSwipe event object
 */
export class PhotoSwipeEvent<T extends keyof PhotoSwipeEventsMap> {
  declare type: T
  declare defaultPrevented: boolean

  constructor(type: T, details?: PhotoSwipeEventsMap[T]) {
    this.type = type
    this.defaultPrevented = false
    if (details) {
      Object.assign(this, details)
    }
  }

  preventDefault(): void {
    this.defaultPrevented = true
  }
}

/**
 * PhotoSwipe base class that can listen and dispatch for events.
 * Shared by PhotoSwipe Core and PhotoSwipe Lightbox, extended by base.js
 */
class Eventable {
  declare _listeners: { [T in keyof PhotoSwipeEventsMap]?: ((event: AugmentedEvent<T>) => void)[] }
  declare _filters: { [T in keyof PhotoSwipeFiltersMap]?: Filter<T>[] }
  declare pswp: PhotoSwipe | undefined
  declare options: PhotoSwipeOptions | undefined

  constructor() {
    this._listeners = {}
    this._filters = {}
    this.pswp = undefined
    this.options = undefined
  }

  addFilter<T extends keyof PhotoSwipeFiltersMap>(
    name: T,
    fn: PhotoSwipeFiltersMap[T],
    priority = 100
  ): void {
    if (!this._filters[name]) {
      this._filters[name] = []
    }

    this._filters[name]?.push({ fn, priority })
    this._filters[name]?.sort((f1, f2) => f1.priority - f2.priority)

    this.pswp?.addFilter(name, fn, priority)
  }

  removeFilter<T extends keyof PhotoSwipeFiltersMap>(name: T, fn: PhotoSwipeFiltersMap[T]): void {
    if (this._filters[name]) {
      // @ts-expect-error
      this._filters[name] = this._filters[name].filter((filter) => filter.fn !== fn)
    }

    if (this.pswp) {
      this.pswp.removeFilter(name, fn)
    }
  }

  applyFilters<T extends keyof PhotoSwipeFiltersMap>(
    name: T,
    ...args: Parameters<PhotoSwipeFiltersMap[T]>
  ): Parameters<PhotoSwipeFiltersMap[T]>[0] {
    this._filters[name]?.forEach((filter) => {
      // @ts-expect-error
      args[0] = filter.fn.apply(this, args)
    })
    return args[0]
  }

  on<T extends keyof PhotoSwipeEventsMap>(name: T, fn: EventCallback<T>): void {
    if (!this._listeners[name]) {
      this._listeners[name] = []
    }
    this._listeners[name]?.push(fn)

    // When binding events to lightbox,
    // also bind events to PhotoSwipe Core,
    // if it's open.
    this.pswp?.on(name, fn)
  }

  off<T extends keyof PhotoSwipeEventsMap>(name: T, fn: EventCallback<T>): void {
    if (this._listeners[name]) {
      // @ts-expect-error
      this._listeners[name] = this._listeners[name].filter((listener) => fn !== listener)
    }

    this.pswp?.off(name, fn)
  }

  dispatch<T extends keyof PhotoSwipeEventsMap>(
    name: T,
    details?: PhotoSwipeEventsMap[T]
  ): AugmentedEvent<T> {
    if (this.pswp) {
      return this.pswp.dispatch(name, details)
    }

    const event = new PhotoSwipeEvent(name, details) as AugmentedEvent<T>

    this._listeners[name]?.forEach((listener) => {
      listener.call(this, event)
    })

    return event
  }
}

export default Eventable
