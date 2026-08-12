import type { IMediaState, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { audioFocus } from '../video/audioFocus'
import { buildVideoElement } from '../video/buildVideoElement'
import { cloneAndSeek } from '../video/cloneAndSeek'
import { createPlayerBridge } from '../video/playerBridge'
import { slideData } from './slideData'

/** Tier 3: no page element — a cold player/embed, bridged when controllable. */
function buildColdPlayer(data: ISlideData, state: IMediaState, index: number): HTMLElement {
  const autoplay = state.slideAutoplay(data) && index === state.watchIntent.index
  if (autoplay) {
    state.watchIntent.index = -1
  }
  const el = buildVideoElement(data, { autoplay })
  if (el instanceof HTMLIFrameElement && data.videoEmbed) {
    state.bridges.set(el, createPlayerBridge(el, data.videoEmbed))
    state.bridgeMuted.set(el, !autoplay)
    if (autoplay) {
      // Sound-autoplay (watch intent) holds the audio focus.
      audioFocus.claim(el, () => {
        state.bridges.get(el)?.setMuted(true)
        state.bridgeMuted.set(el, true)
      })
    }
  } else if (el instanceof HTMLVideoElement) {
    // A self-hosted watch-intent video claims focus whenever it is
    // actually producing sound.
    el.addEventListener('play', () => {
      if (!el.muted) {
        audioFocus.claim(el, () => {
          el.muted = true
        })
      }
    })
  }
  return el
}

function buildVideoContent(data: ISlideData, state: IMediaState, index: number): HTMLElement {
  if (data.adopted) {
    // The live element arrives via the flight hand-off; this container
    // is its landing pad inside the slide.
    const pad = document.createElement('div')
    pad.className = 'arts-lightbox-media arts-lightbox-media_adopted'
    return pad
  }
  if (data.cloneSource) {
    const clone = cloneAndSeek(data.cloneSource)
    clone.classList.add('arts-lightbox-media')
    clone.controls = true
    return clone
  }
  const el = buildColdPlayer(data, state, index)
  el.classList.add('arts-lightbox-media')
  return el
}

function buildHtmlContent(data: ISlideData): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'arts-lightbox-html'
  wrap.innerHTML = data.html ?? ''
  return wrap
}

/**
 * Slide content by tier: adopted page videos (landing pad — the flight
 * delivers the live element), clone-and-seek for hidden/managed sources,
 * cold players/embeds otherwise; html slides render their template.
 */
export function registerSlideContentBuilder(pswp: PhotoSwipe, state: IMediaState): void {
  pswp.on('contentLoad', (e) => {
    const data = slideData(e.content)
    if (data.type === 'video') {
      e.preventDefault()
      e.content.element = buildVideoContent(data, state, e.content.index) as HTMLDivElement
    } else if (data.type === 'html') {
      e.preventDefault()
      e.content.element = buildHtmlContent(data)
    }
  })
}
