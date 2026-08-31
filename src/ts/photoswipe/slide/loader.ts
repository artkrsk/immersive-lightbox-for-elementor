import type PhotoSwipeBase from '../core/base'
import type PhotoSwipe from '../photoswipe'
import type { Point } from '../types'
import { getPanAreaSize, getViewportSize } from '../util/viewport-size'
import type Content from './content'
import type Slide from './slide'
import type { SlideData } from './slide'
import ZoomLevel from './zoom-level'

const MIN_SLIDES_TO_CACHE = 5

/**
 * Lazy-load an image
 * This function is used both by Lightbox and PhotoSwipe core,
 * thus it can be called before dialog is opened.
 *
 * @param itemData Data about the slide
 * @param instance PhotoSwipe or PhotoSwipeLightbox instance
 * @param index
 * @returns Image that is being decoded or false.
 */
export function lazyLoadData(
  itemData: SlideData,
  instance: PhotoSwipeBase,
  index: number
): Content {
  const content = instance.createContentFromData(itemData, index)
  let zoomLevel: ZoomLevel | undefined

  const { options } = instance

  // We need to know dimensions of the image to preload it,
  // as it might use srcset, and we need to define sizes
  if (options) {
    zoomLevel = new ZoomLevel(options, itemData, -1)

    let viewportSize: Point
    if (instance.pswp) {
      viewportSize = instance.pswp.viewportSize
    } else {
      viewportSize = getViewportSize(options, instance)
    }

    const panAreaSize = getPanAreaSize(options, viewportSize, itemData, index)
    zoomLevel.update(content.width, content.height, panAreaSize)
  }

  content.lazyLoad()

  if (zoomLevel) {
    content.setDisplayedSize(
      Math.ceil(content.width * zoomLevel.initial),
      Math.ceil(content.height * zoomLevel.initial)
    )
  }

  return content
}

/**
 * Lazy-loads specific slide.
 * This function is used both by Lightbox and PhotoSwipe core,
 * thus it can be called before dialog is opened.
 *
 * By default, it loads image based on viewport size and initial zoom level.
 *
 * @param index Slide index
 * @param instance PhotoSwipe or PhotoSwipeLightbox eventable instance
 */
export function lazyLoadSlide(index: number, instance: PhotoSwipeBase): Content | undefined {
  const itemData = instance.getItemData(index)

  if (instance.dispatch('lazyLoadSlide', { index, itemData }).defaultPrevented) {
    return
  }

  return lazyLoadData(itemData, instance, index)
}

class ContentLoader {
  declare pswp: PhotoSwipe
  declare limit: number
  private declare _cachedItems: Content[]

  constructor(pswp: PhotoSwipe) {
    this.pswp = pswp
    // Total amount of cached images
    this.limit = Math.max(
      pswp.options.preload[0] + pswp.options.preload[1] + 1,
      MIN_SLIDES_TO_CACHE
    )
    this._cachedItems = []
  }

  /**
   * Lazy load nearby slides based on `preload` option.
   *
   * @param diff Difference between slide indexes that was changed recently, or 0.
   */
  updateLazy(diff?: number): void {
    const { pswp } = this

    if (pswp.dispatch('lazyLoad').defaultPrevented) {
      return
    }

    const { preload } = pswp.options
    const isForward = diff === undefined ? true : diff >= 0
    let i

    // preload[1] - num items to preload in forward direction
    for (i = 0; i <= preload[1]; i++) {
      this.loadSlideByIndex(pswp.currIndex + (isForward ? i : -i))
    }

    // preload[0] - num items to preload in backward direction
    for (i = 1; i <= preload[0]; i++) {
      this.loadSlideByIndex(pswp.currIndex + (isForward ? -i : i))
    }
  }

  loadSlideByIndex(initialIndex: number): void {
    const index = this.pswp.getLoopedIndex(initialIndex)
    // try to get cached content
    let content = this.getContentByIndex(index)
    if (!content) {
      // no cached content, so try to load from scratch:
      content = lazyLoadSlide(index, this.pswp)
      // if content can be loaded, add it to cache:
      if (content) {
        this.addToCache(content)
      }
    }
  }

  getContentBySlide(slide: Slide): Content {
    let content = this.getContentByIndex(slide.index)
    if (!content) {
      // create content if not found in cache
      content = this.pswp.createContentFromData(slide.data, slide.index)
      this.addToCache(content)
    }

    // assign slide to content
    content.setSlide(slide)

    return content
  }

  addToCache(content: Content): void {
    // move to the end of array
    this.removeByIndex(content.index)
    this._cachedItems.push(content)

    if (this._cachedItems.length > this.limit) {
      // Destroy the first content that's not attached
      const indexToRemove = this._cachedItems.findIndex((item) => {
        return !item.isAttached && !item.hasSlide
      })
      if (indexToRemove !== -1) {
        // splice at a found index always yields the element
        const removedItem = this._cachedItems.splice(indexToRemove, 1)[0]!
        removedItem.destroy()
      }
    }
  }

  /**
   * Removes an image from cache, does not destroy() it, just removes.
   */
  removeByIndex(index: number): void {
    const indexToRemove = this._cachedItems.findIndex((item) => item.index === index)
    if (indexToRemove !== -1) {
      this._cachedItems.splice(indexToRemove, 1)
    }
  }

  getContentByIndex(index: number): Content | undefined {
    return this._cachedItems.find((content) => content.index === index)
  }

  destroy(): void {
    this._cachedItems.forEach((content) => content.destroy())
    this._cachedItems = []
  }
}

export default ContentLoader
