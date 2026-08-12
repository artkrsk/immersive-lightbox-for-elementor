import type { IOptions, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { cloneAndSeek } from '../video/adoption'
import { audioFocus } from '../video/audioFocus'
import { createPlayerBridge } from '../video/playerBridge'
import { buildVideoElement } from './buildVideoElement'
import { fitWithin } from './fitWithin'

const DEFAULT_ASPECT = 16 / 9

/** Sound control surface for the ACTIVE slide, consumed by the UI layer. */
export interface IMediaController {
  pauseAll(): void
  getSound(): { muted: boolean; setMuted(muted: boolean): void } | null
}

function slideData(content: { data: unknown }): ISlideData {
  return content.data as ISlideData
}

/**
 * First-class video/html slides on PhotoSwipe's content lifecycle, tiered:
 * adopted page videos (placeholder container — the flight delivers the live
 * element), clone-and-seek for hidden/managed sources, cold players/embeds
 * otherwise. Playback is driven by activation, never by neighbor URLs;
 * embeds are controlled through the readiness-queued player bridge.
 */
export function registerContent(
  pswp: PhotoSwipe,
  opts: IOptions,
  openedIndex: number
): IMediaController {
  const bridges = new Map<HTMLIFrameElement, ReturnType<typeof createPlayerBridge>>()
  // The bridge protocol has no queryable mute state — track what we set.
  const bridgeMuted = new Map<HTMLIFrameElement, boolean>()

  const slideAutoplay = (data: ISlideData): boolean =>
    opts.video.autoplay && data.autoplay !== false

  pswp.addFilter('isContentZoomable', (zoomable, content) => {
    const type = slideData(content).type
    return type === 'video' || type === 'html' ? false : zoomable
  })

  pswp.on('contentLoad', (e) => {
    const data = slideData(e.content)
    if (data.type === 'video') {
      e.preventDefault()
      if (data.adopted) {
        // The live element arrives via the flight hand-off; this container
        // is its landing pad inside the slide.
        const pad = document.createElement('div')
        pad.className = 'arts-lightbox-media arts-lightbox-media_adopted'
        e.content.element = pad
      } else if (data.cloneSource) {
        const clone = cloneAndSeek(data.cloneSource)
        clone.classList.add('arts-lightbox-media')
        clone.controls = true
        e.content.element = clone as unknown as HTMLDivElement
      } else {
        const autoplay = slideAutoplay(data) && e.content.index === openedIndex
        const el = buildVideoElement(data, { autoplay })
        el.classList.add('arts-lightbox-media')
        if (el instanceof HTMLIFrameElement && data.videoEmbed) {
          bridges.set(el, createPlayerBridge(el, data.videoEmbed))
          bridgeMuted.set(el, !autoplay)
          if (autoplay) {
            // Sound-autoplay (watch intent) holds the audio focus.
            audioFocus.claim(() => {
              bridges.get(el)?.setMuted(true)
              bridgeMuted.set(el, true)
            })
          }
        } else if (el instanceof HTMLVideoElement) {
          // A self-hosted watch-intent video claims focus whenever it is
          // actually producing sound.
          el.addEventListener('play', () => {
            if (!el.muted) {
              audioFocus.claim(() => {
                el.muted = true
              })
            }
          })
        }
        e.content.element = el as HTMLDivElement
      }
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
    if (data.type !== 'video' || !slideAutoplay(data)) {
      return
    }
    if (data.adopted) {
      // Ambient continuation: resume if a deactivate paused it.
      void data.adopted.element.play().catch(() => {})
      return
    }
    const el = e.content.element
    if (el instanceof HTMLVideoElement) {
      void el.play().catch(() => {})
    } else if (el instanceof HTMLIFrameElement) {
      bridges.get(el)?.play()
    }
  })

  pswp.on('contentDeactivate', (e) => {
    const data = slideData(e.content)
    if (data.type !== 'video') {
      return
    }
    if (data.adopted) {
      data.adopted.element.pause()
      return
    }
    const el = e.content.element
    if (el instanceof HTMLVideoElement) {
      el.pause()
    } else if (el instanceof HTMLIFrameElement) {
      bridges.get(el)?.pause()
    }
  })

  const pauseAll = (): void => {
    for (const bridge of bridges.values()) {
      bridge.pause()
    }
    for (const holder of pswp.mainScroll.itemHolders) {
      const el = holder.slide?.content?.element
      // Adopted elements are deliberately NOT paused — they go home playing.
      if (el instanceof HTMLVideoElement) {
        el.pause()
      }
    }
  }

  pswp.on('destroy', () => {
    pauseAll()
    for (const bridge of bridges.values()) {
      bridge.destroy()
    }
    bridges.clear()
    bridgeMuted.clear()
  })

  const getSound: IMediaController['getSound'] = () => {
    const slide = pswp.currSlide
    if (!slide) {
      return null
    }
    const data = slideData(slide)
    if (data.type !== 'video') {
      return null
    }
    const el = data.adopted?.element ?? slide.content?.element
    if (el instanceof HTMLVideoElement) {
      return {
        muted: el.muted,
        setMuted: (muted) => {
          el.muted = muted
          if (!muted) {
            audioFocus.claim(() => {
              el.muted = true
            })
            void el.play().catch(() => {})
          }
        }
      }
    }
    if (el instanceof HTMLIFrameElement) {
      const bridge = bridges.get(el)
      if (!bridge) {
        return null
      }
      return {
        muted: bridgeMuted.get(el) ?? true,
        setMuted: (muted) => {
          bridge.setMuted(muted)
          bridgeMuted.set(el, muted)
          if (!muted) {
            bridge.play()
            audioFocus.claim(() => {
              bridge.setMuted(true)
              bridgeMuted.set(el, true)
            })
          }
        }
      }
    }
    return null
  }

  return { pauseAll, getSound }
}
