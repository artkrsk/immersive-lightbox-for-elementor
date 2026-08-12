import type PhotoSwipe from 'photoswipe'
import type { ISlideData } from '../interfaces'
import { buildVideoElement } from './buildVideoElement'
import { fitWithin } from './fitWithin'

const DEFAULT_ASPECT = 16 / 9

function slideData(content: { data: unknown }): ISlideData {
  return content.data as ISlideData
}

function playPause(el: HTMLElement | undefined, data: ISlideData, play: boolean): void {
  if (!el) {
    return
  }
  if (el instanceof HTMLVideoElement) {
    if (play) {
      void el.play().catch(() => {})
    } else {
      el.pause()
    }
    return
  }
  const frame = el instanceof HTMLIFrameElement ? el : null
  const message =
    data.videoEmbed === 'youtube'
      ? JSON.stringify({ event: 'command', func: play ? 'playVideo' : 'pauseVideo', args: [] })
      : JSON.stringify({ method: play ? 'play' : 'pause' })
  frame?.contentWindow?.postMessage(message, '*')
}

/**
 * First-class video/html slides on PhotoSwipe's content lifecycle: we build
 * the element (contentLoad), size it ourselves (contentResize), and drive
 * play/pause on activation — the exact glue upstream never shipped.
 */
export function registerContent(pswp: PhotoSwipe): void {
  pswp.addFilter('isContentZoomable', (zoomable, content) => {
    const type = slideData(content).type
    return type === 'video' || type === 'html' ? false : zoomable
  })

  pswp.on('contentLoad', (e) => {
    const data = slideData(e.content)
    if (data.type === 'video') {
      e.preventDefault()
      const el = buildVideoElement(data)
      el.classList.add('arts-lightbox-media')
      // PhotoSwipe types element as img|div but accepts any node at runtime —
      // this is the documented custom-content pattern.
      e.content.element = el as HTMLDivElement
    } else if (data.type === 'html') {
      e.preventDefault()
      const wrap = document.createElement('div')
      wrap.className = 'arts-lightbox-html'
      wrap.innerHTML = data.html ?? ''
      e.content.element = wrap
    }
  })

  pswp.on('contentResize', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video' || !e.content.element) {
      return
    }
    e.preventDefault()
    const aspect = data.width && data.height ? data.width / data.height : DEFAULT_ASPECT
    const fit = fitWithin({ x: e.width, y: e.height }, aspect)
    const el = e.content.element
    el.style.width = `${fit.w}px`
    el.style.height = `${fit.h}px`
  })

  // Slides whose dims were guessed from thumb attributes upgrade to the real
  // naturals once the full image is in — right aspect was never the problem,
  // the SCALE was (PhotoSwipe caps zoom at what it believes is natural size).
  pswp.on('loadComplete', (e) => {
    const data = slideData(e.content)
    const slide = e.slide
    const el = e.content.element
    if (!slide || !data.dimsGuessed || !(el instanceof HTMLImageElement) || !el.naturalWidth) {
      return
    }
    if (slide.width === el.naturalWidth && slide.height === el.naturalHeight) {
      return
    }
    slide.width = el.naturalWidth
    slide.height = el.naturalHeight
    data.width = el.naturalWidth
    data.height = el.naturalHeight
    data.dimsGuessed = false
    // The resize() recipe: re-derive zoom levels, re-place, re-paint.
    slide.calculateSize()
    slide.zoomAndPanToInitial()
    slide.applyCurrentZoomPan()
    slide.updateContentSize(true)
  })

  pswp.on('contentActivate', (e) => {
    const data = slideData(e.content)
    if (data.type === 'video') {
      playPause(e.content.element, data, true)
    }
  })

  pswp.on('contentDeactivate', (e) => {
    const data = slideData(e.content)
    if (data.type === 'video') {
      playPause(e.content.element, data, false)
    }
  })
}
