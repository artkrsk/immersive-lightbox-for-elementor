import type PhotoSwipe from '../photoswipe'
import { arrowNext, arrowPrev } from './button-arrow'
import closeButton from './button-close'
import zoomButton from './button-zoom'
import { counterIndicator } from './counter-indicator'
import { loadingIndicator } from './loading-indicator'
import type { UIElementData } from './ui-element'
import UIElement from './ui-element'

/**
 * Set special class on element when image is zoomed.
 *
 * By default, it is used to adjust
 * zoom icon and zoom cursor via CSS.
 */
function setZoomedIn(el: HTMLElement, isZoomedIn: boolean): void {
  el.classList.toggle('pswp--zoomed-in', isZoomedIn)
}

class UI {
  declare pswp: PhotoSwipe
  declare isRegistered: boolean
  declare uiElementsData: UIElementData[]
  declare items: (UIElement | UIElementData)[]
  declare updatePreloaderVisibility: () => void
  private declare _lastUpdatedZoomLevel: number | undefined

  constructor(pswp: PhotoSwipe) {
    this.pswp = pswp
    this.isRegistered = false
    this.uiElementsData = []
    this.items = []
    this.updatePreloaderVisibility = () => {}

    this._lastUpdatedZoomLevel = undefined
  }

  init(): void {
    const { pswp } = this
    this.isRegistered = false
    this.uiElementsData = [
      closeButton,
      arrowPrev,
      arrowNext,
      zoomButton,
      loadingIndicator,
      counterIndicator
    ]

    pswp.dispatch('uiRegister')

    // sort by order
    this.uiElementsData.sort((a, b) => {
      // default order is 0
      return (a.order || 0) - (b.order || 0)
    })

    this.items = []

    this.isRegistered = true
    this.uiElementsData.forEach((uiElementData) => {
      this.registerElement(uiElementData)
    })

    pswp.on('change', () => {
      pswp.element?.classList.toggle('pswp--one-slide', pswp.getNumItems() === 1)
    })

    pswp.on('zoomPanUpdate', () => this._onZoomPanUpdate())
  }

  registerElement(elementData: UIElementData): void {
    if (this.isRegistered) {
      this.items.push(new UIElement(this.pswp, elementData))
    } else {
      this.uiElementsData.push(elementData)
    }
  }

  /**
   * Fired each time zoom or pan position is changed.
   * Update classes that control visibility of zoom button and cursor icon.
   */
  private _onZoomPanUpdate(): void {
    const { template, currSlide, options } = this.pswp

    if (this.pswp.opener.isClosing || !template || !currSlide) {
      return
    }

    let { currZoomLevel } = currSlide

    // if not open yet - check against initial zoom level
    if (!this.pswp.opener.isOpen) {
      currZoomLevel = currSlide.zoomLevels.initial
    }

    if (currZoomLevel === this._lastUpdatedZoomLevel) {
      return
    }
    this._lastUpdatedZoomLevel = currZoomLevel

    const currZoomLevelDiff = currSlide.zoomLevels.initial - currSlide.zoomLevels.secondary

    // Initial and secondary zoom levels are almost equal
    if (Math.abs(currZoomLevelDiff) < 0.01 || !currSlide.isZoomable()) {
      // disable zoom
      setZoomedIn(template, false)
      template.classList.remove('pswp--zoom-allowed')
      return
    }

    template.classList.add('pswp--zoom-allowed')

    const potentialZoomLevel =
      currZoomLevel === currSlide.zoomLevels.initial
        ? currSlide.zoomLevels.secondary
        : currSlide.zoomLevels.initial

    setZoomedIn(template, potentialZoomLevel <= currZoomLevel)

    if (options.imageClickAction === 'zoom' || options.imageClickAction === 'zoom-or-close') {
      template.classList.add('pswp--click-to-zoom')
    }
  }
}

export default UI
