import type PhotoSwipe from '../photoswipe'
import type { Methods } from '../types'
import { createElement } from '../util/util'

export interface UIElementMarkupProps {
  isCustomSVG?: boolean
  inner: string
  outlineID?: string
  size?: number | string
}

export interface UIElementData {
  name?: DefaultUIElements | string
  className?: string
  html?: UIElementMarkup
  isButton?: boolean
  tagName?: keyof HTMLElementTagNameMap
  title?: string
  ariaLabel?: string
  onInit?: (element: HTMLElement, pswp: PhotoSwipe) => void
  onClick?: Methods<PhotoSwipe> | ((e: MouseEvent, element: HTMLElement, pswp: PhotoSwipe) => void)
  appendTo?: 'bar' | 'wrapper' | 'root'
  order?: number
}

export type DefaultUIElements = 'arrowPrev' | 'arrowNext' | 'close' | 'zoom' | 'counter'

export type UIElementMarkup = string | UIElementMarkupProps

function addElementHTML(htmlData?: UIElementMarkup): string {
  if (typeof htmlData === 'string') {
    // Allow developers to provide full svg,
    // For example:
    // <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="pswp__icn">
    //   <path d="..." />
    //   <circle ... />
    // </svg>
    // Can also be any HTML string.
    return htmlData
  }

  if (!htmlData || !htmlData.isCustomSVG) {
    return ''
  }

  const svgData = htmlData
  let out = '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 %d %d" width="%d" height="%d">'
  // replace all %d with size
  out = out.split('%d').join((svgData.size || 32) as string)

  // Icons may contain outline/shadow,
  // to make it we "clone" base icon shape and add border to it.
  // Icon itself and border are styled via CSS.
  //
  // Property shadowID defines ID of element that should be cloned.
  if (svgData.outlineID) {
    out += '<use class="pswp__icn-shadow" xlink:href="#' + svgData.outlineID + '"/>'
  }

  out += svgData.inner

  out += '</svg>'

  return out
}

class UIElement {
  constructor(pswp: PhotoSwipe, data: UIElementData) {
    const name = data.name || data.className
    let elementHTML = data.html

    // @ts-expect-error lookup only by `data.name` maybe?
    if (pswp.options[name] === false) {
      // exit if element is disabled from options
      return
    }

    // Allow to override SVG icons from options
    // @ts-expect-error lookup only by `data.name` maybe?
    if (typeof pswp.options[name + 'SVG'] === 'string') {
      // arrowPrevSVG
      // arrowNextSVG
      // closeSVG
      // zoomSVG
      // @ts-expect-error lookup only by `data.name` maybe?
      elementHTML = pswp.options[name + 'SVG']
    }

    pswp.dispatch('uiElementCreate', { data })

    let className = ''
    if (data.isButton) {
      className += 'pswp__button '
      className += data.className || `pswp__button--${data.name}`
    } else {
      className += data.className || `pswp__${data.name}`
    }

    let tagName = data.isButton ? data.tagName || 'button' : data.tagName || 'div'
    tagName = tagName.toLowerCase() as keyof HTMLElementTagNameMap
    const element: HTMLElement = createElement(className, tagName)

    if (data.isButton) {
      if (tagName === 'button') {
        ;(element as HTMLButtonElement).type = 'button'
      }

      let { title } = data
      const { ariaLabel } = data

      // @ts-expect-error lookup only by `data.name` maybe?
      if (typeof pswp.options[name + 'Title'] === 'string') {
        // @ts-expect-error lookup only by `data.name` maybe?
        title = pswp.options[name + 'Title']
      }

      if (title) {
        element.title = title
      }

      const ariaText = ariaLabel || title
      if (ariaText) {
        element.setAttribute('aria-label', ariaText)
      }
    }

    element.innerHTML = addElementHTML(elementHTML)

    if (data.onInit) {
      data.onInit(element, pswp)
    }

    if (data.onClick) {
      element.onclick = (e) => {
        if (typeof data.onClick === 'string') {
          // @ts-expect-error
          pswp[data.onClick]()
        } else if (typeof data.onClick === 'function') {
          data.onClick(e, element, pswp)
        }
      }
    }

    // Top bar is default position
    const appendTo = data.appendTo || 'bar'
    /** root element by default */
    let container: HTMLElement | undefined = pswp.element
    if (appendTo === 'bar') {
      if (!pswp.topBar) {
        pswp.topBar = createElement('pswp__top-bar pswp__hide-on-close', 'div', pswp.scrollWrap)
      }
      container = pswp.topBar
    } else {
      // element outside of top bar gets a secondary class
      // that makes element fade out on close
      element.classList.add('pswp__hide-on-close')

      if (appendTo === 'wrapper') {
        container = pswp.scrollWrap
      }
    }

    container?.appendChild(pswp.applyFilters('uiElement', element, data))
  }
}

export default UIElement
