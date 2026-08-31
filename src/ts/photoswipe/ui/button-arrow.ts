/*
  Backward and forward arrow buttons
 */

import type PhotoSwipe from '../photoswipe'
import type { UIElementData } from './ui-element'

function initArrowButton(element: HTMLElement, pswp: PhotoSwipe, isNextButton?: boolean): void {
  element.classList.add('pswp__button--arrow')
  // TODO: this should point to a unique id for this instance
  element.setAttribute('aria-controls', 'pswp__items')
  pswp.on('change', () => {
    if (!pswp.options.loop) {
      if (isNextButton) {
        ;(element as HTMLButtonElement).disabled = !(pswp.currIndex < pswp.getNumItems() - 1)
      } else {
        ;(element as HTMLButtonElement).disabled = !(pswp.currIndex > 0)
      }
    }
  })
}

export const arrowPrev: UIElementData = {
  name: 'arrowPrev',
  className: 'pswp__button--arrow--prev',
  title: 'Previous',
  order: 10,
  isButton: true,
  appendTo: 'wrapper',
  html: {
    isCustomSVG: true,
    size: 60,
    inner: '<path d="M29 43l-3 3-16-16 16-16 3 3-13 13 13 13z" id="pswp__icn-arrow"/>',
    outlineID: 'pswp__icn-arrow'
  },
  onClick: 'prev',
  onInit: initArrowButton
}

export const arrowNext: UIElementData = {
  name: 'arrowNext',
  className: 'pswp__button--arrow--next',
  title: 'Next',
  order: 11,
  isButton: true,
  appendTo: 'wrapper',
  html: {
    isCustomSVG: true,
    size: 60,
    inner: '<use xlink:href="#pswp__icn-arrow"/>',
    outlineID: 'pswp__icn-arrow'
  },
  onClick: 'next',
  onInit: (el, pswp) => {
    initArrowButton(el, pswp, true)
  }
}
