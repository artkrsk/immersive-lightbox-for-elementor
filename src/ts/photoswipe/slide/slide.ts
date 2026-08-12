import type { Content } from '../core/eventable'
import type PhotoSwipe from '../photoswipe'
import type { Point } from '../types'
import {
  clamp,
  createElement,
  equalizePoints,
  roundPoint,
  setTransform,
  toTransformString
} from '../util/util'
import { getPanAreaSize } from '../util/viewport-size'
import PanBounds from './pan-bounds'
import ZoomLevel from './zoom-level'

interface _SlideData {
  /** thumbnail element */
  element?: HTMLElement
  /** image URL */
  src?: string
  /** image srcset */
  srcset?: string
  /** image width (deprecated) */
  w?: number
  /** image height (deprecated) */
  h?: number
  /** image width */
  width?: number
  /** image height */
  height?: number
  /** placeholder image URL that's displayed before large image is loaded */
  msrc?: string
  /** image alt text */
  alt?: string
  /** whether thumbnail is cropped client-side or not */
  thumbCropped?: boolean
  /** html content of a slide */
  html?: string
  /** slide type */
  type?: 'image' | 'html' | string
}

export type SlideData = _SlideData & Record<string, any>

/**
 * Renders and allows to control a single slide
 */
class Slide {
  declare data: SlideData
  declare index: number
  declare pswp: PhotoSwipe
  declare isActive: boolean
  declare currentResolution: number
  declare panAreaSize: Point
  declare pan: Point
  declare isFirstSlide: boolean
  declare zoomLevels: ZoomLevel
  declare content: Content
  declare container: HTMLDivElement
  declare holderElement: HTMLElement | null
  declare currZoomLevel: number
  declare width: number
  declare height: number
  declare heavyAppended: boolean
  declare bounds: PanBounds
  declare prevDisplayedWidth: number
  declare prevDisplayedHeight: number

  constructor(data: SlideData, index: number, pswp: PhotoSwipe) {
    this.data = data
    this.index = index
    this.pswp = pswp
    this.isActive = index === pswp.currIndex
    this.currentResolution = 0
    this.panAreaSize = { x: 0, y: 0 }
    this.pan = { x: 0, y: 0 }

    this.isFirstSlide = this.isActive && !pswp.opener.isOpen

    this.zoomLevels = new ZoomLevel(pswp.options, data, index, pswp)

    this.pswp.dispatch('gettingData', {
      slide: this,
      data: this.data,
      index
    })

    this.content = this.pswp.contentLoader.getContentBySlide(this)
    this.container = createElement('pswp__zoom-wrap', 'div')
    this.holderElement = null

    this.currZoomLevel = 1
    this.width = this.content.width
    this.height = this.content.height
    this.heavyAppended = false
    this.bounds = new PanBounds(this)

    this.prevDisplayedWidth = -1
    this.prevDisplayedHeight = -1

    this.pswp.dispatch('slideInit', { slide: this })
  }

  /**
   * If this slide is active/current/visible
   */
  setIsActive(isActive: boolean): void {
    if (isActive && !this.isActive) {
      // slide just became active
      this.activate()
    } else if (!isActive && this.isActive) {
      // slide just became non-active
      this.deactivate()
    }
  }

  /**
   * Appends slide content to DOM
   */
  append(holderElement: HTMLElement): void {
    this.holderElement = holderElement

    this.container.style.transformOrigin = '0 0'

    // Slide appended to DOM
    if (!this.data) {
      return
    }

    this.calculateSize()

    this.load()
    this.updateContentSize()
    this.appendHeavy()

    this.holderElement.appendChild(this.container)

    this.zoomAndPanToInitial()

    this.pswp.dispatch('firstZoomPan', { slide: this })

    this.applyCurrentZoomPan()

    this.pswp.dispatch('afterSetContent', { slide: this })

    if (this.isActive) {
      this.activate()
    }
  }

  load(): void {
    this.content.load(false)
    this.pswp.dispatch('slideLoad', { slide: this })
  }

  /**
   * Append "heavy" DOM elements
   *
   * This may depend on a type of slide,
   * but generally these are large images.
   */
  appendHeavy(): void {
    const { pswp } = this
    const appendHeavyNearby = true // todo

    // Avoid appending heavy elements during animations
    if (
      this.heavyAppended ||
      !pswp.opener.isOpen ||
      pswp.mainScroll.isShifted() ||
      (!this.isActive && !appendHeavyNearby)
    ) {
      return
    }

    if (this.pswp.dispatch('appendHeavy', { slide: this }).defaultPrevented) {
      return
    }

    this.heavyAppended = true

    this.content.append()

    this.pswp.dispatch('appendHeavyContent', { slide: this })
  }

  /**
   * Triggered when this slide is active (selected).
   *
   * If it's part of opening/closing transition -
   * activate() will trigger after the transition is ended.
   */
  activate(): void {
    this.isActive = true
    this.appendHeavy()
    this.content.activate()
    this.pswp.dispatch('slideActivate', { slide: this })
  }

  /**
   * Triggered when this slide becomes inactive.
   *
   * Slide can become inactive only after it was active.
   */
  deactivate(): void {
    this.isActive = false
    this.content.deactivate()

    if (this.currZoomLevel !== this.zoomLevels.initial) {
      // allow filtering
      this.calculateSize()
    }

    // reset zoom level
    this.currentResolution = 0
    this.zoomAndPanToInitial()
    this.applyCurrentZoomPan()
    this.updateContentSize()

    this.pswp.dispatch('slideDeactivate', { slide: this })
  }

  /**
   * The slide should destroy itself, it will never be used again.
   * (unbind all events and destroy internal components)
   */
  destroy(): void {
    this.content.hasSlide = false
    this.content.remove()
    this.container.remove()
    this.pswp.dispatch('slideDestroy', { slide: this })
  }

  resize(): void {
    if (this.currZoomLevel === this.zoomLevels.initial || !this.isActive) {
      // Keep initial zoom level if it was before the resize,
      // as well as when this slide is not active

      // Reset position and scale to original state
      this.calculateSize()
      this.currentResolution = 0
      this.zoomAndPanToInitial()
      this.applyCurrentZoomPan()
      this.updateContentSize()
    } else {
      // readjust pan position if it's beyond the bounds
      this.calculateSize()
      this.bounds.update(this.currZoomLevel)
      this.panTo(this.pan.x, this.pan.y)
    }
  }

  /**
   * Apply size to current slide content,
   * based on the current resolution and scale.
   *
   * @param force if size should be updated even if dimensions weren't changed
   */
  updateContentSize(force?: boolean): void {
    // Use initial zoom level
    // if resolution is not defined (user didn't zoom yet)
    const scaleMultiplier = this.currentResolution || this.zoomLevels.initial

    if (!scaleMultiplier) {
      return
    }

    const width = Math.round(this.width * scaleMultiplier) || this.pswp.viewportSize.x
    const height = Math.round(this.height * scaleMultiplier) || this.pswp.viewportSize.y

    if (!this.sizeChanged(width, height) && !force) {
      return
    }
    this.content.setDisplayedSize(width, height)
  }

  sizeChanged(width: number, height: number): boolean {
    if (width !== this.prevDisplayedWidth || height !== this.prevDisplayedHeight) {
      this.prevDisplayedWidth = width
      this.prevDisplayedHeight = height
      return true
    }

    return false
  }

  getPlaceholderElement(): HTMLImageElement | HTMLDivElement | null | undefined {
    return this.content.placeholder?.element
  }

  /**
   * Zoom current slide image to...
   *
   * @param destZoomLevel Destination zoom level.
   * @param centerPoint
   * Transform origin center point, or false if viewport center should be used.
   * @param transitionDuration Transition duration, may be set to 0.
   * @param ignoreBounds Minimum and maximum zoom levels will be ignored.
   */
  zoomTo(
    destZoomLevel: number,
    centerPoint?: Point,
    transitionDuration?: number | false,
    ignoreBounds?: boolean
  ): void {
    const { pswp } = this
    if (!this.isZoomable() || pswp.mainScroll.isShifted()) {
      return
    }

    pswp.dispatch('beforeZoomTo', {
      destZoomLevel,
      centerPoint,
      transitionDuration
    })

    // stop all pan and zoom transitions
    pswp.animations.stopAllPan()

    // if (!centerPoint) {
    //   centerPoint = pswp.getViewportCenterPoint();
    // }

    const prevZoomLevel = this.currZoomLevel

    if (!ignoreBounds) {
      destZoomLevel = clamp(destZoomLevel, this.zoomLevels.min, this.zoomLevels.max)
    }

    // if (transitionDuration === undefined) {
    //   transitionDuration = this.pswp.options.zoomAnimationDuration;
    // }

    this.setZoomLevel(destZoomLevel)
    this.pan.x = this.calculateZoomToPanOffset('x', centerPoint, prevZoomLevel)
    this.pan.y = this.calculateZoomToPanOffset('y', centerPoint, prevZoomLevel)
    roundPoint(this.pan)

    const finishTransition = () => {
      this._setResolution(destZoomLevel)
      this.applyCurrentZoomPan()
    }

    if (!transitionDuration) {
      finishTransition()
    } else {
      pswp.animations.startTransition({
        isPan: true,
        name: 'zoomTo',
        target: this.container,
        transform: this.getCurrentTransform(),
        onComplete: finishTransition,
        duration: transitionDuration,
        easing: pswp.options.easing
      })
    }
  }

  toggleZoom(centerPoint?: Point): void {
    this.zoomTo(
      this.currZoomLevel === this.zoomLevels.initial
        ? this.zoomLevels.secondary
        : this.zoomLevels.initial,
      centerPoint,
      this.pswp.options.zoomAnimationDuration
    )
  }

  /**
   * Updates zoom level property and recalculates new pan bounds,
   * unlike zoomTo it does not apply transform (use applyCurrentZoomPan)
   */
  setZoomLevel(currZoomLevel: number): void {
    this.currZoomLevel = currZoomLevel
    this.bounds.update(this.currZoomLevel)
  }

  /**
   * Get pan position after zoom at a given `point`.
   *
   * Always call setZoomLevel(newZoomLevel) beforehand to recalculate
   * pan bounds according to the new zoom level.
   *
   * @param axis
   * @param point
   * point based on which zoom is performed, usually refers to the current mouse position,
   * if false - viewport center will be used.
   * @param prevZoomLevel Zoom level before new zoom was applied.
   */
  calculateZoomToPanOffset(axis: 'x' | 'y', point?: Point, prevZoomLevel?: number): number {
    const totalPanDistance = this.bounds.max[axis] - this.bounds.min[axis]
    if (totalPanDistance === 0) {
      return this.bounds.center[axis]
    }

    if (!point) {
      point = this.pswp.getViewportCenterPoint()
    }

    if (!prevZoomLevel) {
      prevZoomLevel = this.zoomLevels.initial
    }

    const zoomFactor = this.currZoomLevel / prevZoomLevel
    return this.bounds.correctPan(axis, (this.pan[axis] - point[axis]) * zoomFactor + point[axis])
  }

  /**
   * Apply pan and keep it within bounds.
   */
  panTo(panX: number, panY: number): void {
    this.pan.x = this.bounds.correctPan('x', panX)
    this.pan.y = this.bounds.correctPan('y', panY)
    this.applyCurrentZoomPan()
  }

  /**
   * If the slide in the current state can be panned by the user
   */
  isPannable(): boolean {
    return Boolean(this.width) && this.currZoomLevel > this.zoomLevels.fit
  }

  /**
   * If the slide can be zoomed
   */
  isZoomable(): boolean {
    return Boolean(this.width) && this.content.isZoomable()
  }

  /**
   * Apply transform and scale based on
   * the current pan position (this.pan) and zoom level (this.currZoomLevel)
   */
  applyCurrentZoomPan(): void {
    this._applyZoomTransform(this.pan.x, this.pan.y, this.currZoomLevel)
    if (this === this.pswp.currSlide) {
      this.pswp.dispatch('zoomPanUpdate', { slide: this })
    }
  }

  zoomAndPanToInitial(): void {
    this.currZoomLevel = this.zoomLevels.initial

    // pan according to the zoom level
    this.bounds.update(this.currZoomLevel)
    equalizePoints(this.pan, this.bounds.center)

    // @arts fork: a viewport-normalized pan seed (the click that opened the
    // lightbox, mapped like explore mode maps the mouse) overrides the
    // centered default whenever the initial pan is (re)applied — content
    // appends and resizes keep aiming at the seed until the consumer clears
    // it (first mousemove / slide change).
    const seed = this.pswp.options.artsSeedPan
    if (seed && this === this.pswp.currSlide && this.currZoomLevel > this.zoomLevels.fit + 0.001) {
      const { min, max } = this.bounds
      this.pan.x = min.x + (max.x - min.x) * seed.x
      this.pan.y = min.y + (max.y - min.y) * seed.y
    }

    this.pswp.dispatch('initialZoomPan', { slide: this })
  }

  /**
   * Set translate and scale based on current resolution
   */
  private _applyZoomTransform(x: number, y: number, zoom: number): void {
    zoom /= this.currentResolution || this.zoomLevels.initial
    setTransform(this.container, x, y, zoom)
  }

  calculateSize(): void {
    const { pswp } = this

    equalizePoints(
      this.panAreaSize,
      getPanAreaSize(pswp.options, pswp.viewportSize, this.data, this.index)
    )

    this.zoomLevels.update(this.width, this.height, this.panAreaSize)

    pswp.dispatch('calcSlideSize', {
      slide: this
    })
  }

  getCurrentTransform(): string {
    const scale = this.currZoomLevel / (this.currentResolution || this.zoomLevels.initial)
    return toTransformString(this.pan.x, this.pan.y, scale)
  }

  /**
   * Set resolution and re-render the image.
   *
   * For example, if the real image size is 2000x1500,
   * and resolution is 0.5 - it will be rendered as 1000x750.
   *
   * Image with zoom level 2 and resolution 0.5 is
   * the same as image with zoom level 1 and resolution 1.
   *
   * Used to optimize animations and make
   * sure that browser renders image in the highest quality.
   * Also used by responsive images to load the correct one.
   */
  _setResolution(newResolution: number): void {
    if (newResolution === this.currentResolution) {
      return
    }

    this.currentResolution = newResolution
    this.updateContentSize()

    this.pswp.dispatch('resolutionChanged')
  }
}

export default Slide
