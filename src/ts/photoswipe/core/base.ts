import Content from '../slide/content'
import { lazyLoadData } from '../slide/loader'
import type { SlideData } from '../slide/slide'
import { getElementsFromOption } from '../util/util'
import Eventable from './eventable'

/**
 * PhotoSwipe base class that can retrieve data about every slide.
 * Shared by PhotoSwipe Core and PhotoSwipe Lightbox
 */
class PhotoSwipeBase extends Eventable {
  /**
   * Get total number of slides
   */
  getNumItems(): number {
    let numItems = 0
    const dataSource = this.options?.dataSource

    if (dataSource && 'length' in dataSource) {
      // may be an array or just object with length property
      numItems = dataSource.length
    } else if (dataSource && 'gallery' in dataSource) {
      // query DOM elements
      if (!dataSource.items) {
        dataSource.items = this._getGalleryDOMElements(dataSource.gallery)
      }

      if (dataSource.items) {
        numItems = dataSource.items.length
      }
    }

    // legacy event, before filters were introduced
    const event = this.dispatch('numItems', {
      dataSource,
      numItems
    })
    return this.applyFilters('numItems', event.numItems, dataSource)
  }

  createContentFromData(slideData: SlideData, index: number): Content {
    return new Content(slideData, this, index)
  }

  /**
   * Get item data by index.
   *
   * "item data" should contain normalized information that PhotoSwipe needs to generate a slide.
   * For example, it may contain properties like
   * `src`, `srcset`, `w`, `h`, which will be used to generate a slide with image.
   */
  getItemData(index: number): SlideData {
    const dataSource = this.options?.dataSource
    // `| undefined`: indexing past the end is representable — the legacy
    // `itemData || {}` below has always normalized it.
    let dataSourceItem: SlideData | HTMLElement | undefined = {}
    if (Array.isArray(dataSource)) {
      // Datasource is an array of elements
      dataSourceItem = dataSource[index]
    } else if (dataSource && 'gallery' in dataSource) {
      // dataSource has gallery property,
      // thus it was created by Lightbox, based on
      // gallery and children options

      // query DOM elements
      if (!dataSource.items) {
        dataSource.items = this._getGalleryDOMElements(dataSource.gallery)
      }

      dataSourceItem = dataSource.items[index]
    }

    let itemData: SlideData | HTMLElement | undefined = dataSourceItem

    if (itemData instanceof Element) {
      itemData = this._domElementToItemData(itemData)
    }

    // Dispatching the itemData event,
    // it's a legacy verion before filters were introduced
    const event = this.dispatch('itemData', {
      itemData: itemData || {},
      index
    })

    return this.applyFilters('itemData', event.itemData, index)
  }

  /**
   * Get array of gallery DOM elements,
   * based on childSelector and gallery element.
   */
  _getGalleryDOMElements(galleryElement: HTMLElement): HTMLElement[] {
    if (this.options?.children || this.options?.childSelector) {
      return (
        getElementsFromOption(this.options.children, this.options.childSelector, galleryElement) ||
        []
      )
    }

    return [galleryElement]
  }

  /**
   * Converts DOM element to item data object.
   *
   * @param element DOM element
   */
  _domElementToItemData(element: HTMLElement): SlideData {
    const itemData: SlideData = {
      element
    }

    const linkEl = (
      element.tagName === 'A' ? element : element.querySelector('a')
    ) as HTMLAnchorElement

    if (linkEl) {
      // src comes from data-pswp-src attribute,
      // if it's empty link href is used
      itemData.src = linkEl.dataset.pswpSrc || linkEl.href

      if (linkEl.dataset.pswpSrcset) {
        itemData.srcset = linkEl.dataset.pswpSrcset
      }

      itemData.width = linkEl.dataset.pswpWidth ? parseInt(linkEl.dataset.pswpWidth, 10) : 0
      itemData.height = linkEl.dataset.pswpHeight ? parseInt(linkEl.dataset.pswpHeight, 10) : 0

      // support legacy w & h properties
      itemData.w = itemData.width
      itemData.h = itemData.height

      if (linkEl.dataset.pswpType) {
        itemData.type = linkEl.dataset.pswpType
      }

      const thumbnailEl = element.querySelector('img')

      if (thumbnailEl) {
        // msrc is URL to placeholder image that's displayed before large image is loaded
        // by default it's displayed only for the first slide
        itemData.msrc = thumbnailEl.currentSrc || thumbnailEl.src
        itemData.alt = thumbnailEl.getAttribute('alt') ?? ''
      }

      if (linkEl.dataset.pswpCropped || linkEl.dataset.cropped) {
        itemData.thumbCropped = true
      }
    }

    return this.applyFilters('domItemData', itemData, element, linkEl)
  }

  /**
   * Lazy-load by slide data
   *
   * @param itemData Data about the slide
   * @param index
   * @returns Image that is being decoded or false.
   */
  lazyLoadData(itemData: SlideData, index: number): Content {
    return lazyLoadData(itemData, this, index)
  }
}

export default PhotoSwipeBase
