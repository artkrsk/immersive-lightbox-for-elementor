import type { IMediaState, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { isTagElement } from '../utils/isTagElement'
import { audioFocus } from '../video/audioFocus'
import { buildVideoElement } from '../video/buildVideoElement'
import { createPlayerBridge } from '../video/playerBridge'
import { playingSignal } from '../video/playingSignal'
import { slideData } from './slideData'

/** A cold player/embed, bridged when controllable. */
function buildColdPlayer(data: ISlideData, state: IMediaState, index: number): HTMLElement {
  const autoplay = state.slideAutoplay(data) && index === state.watchIntent.index
  if (autoplay) {
    state.watchIntent.index = -1
  }
  const el = buildVideoElement(data, { autoplay })
  if (isTagElement(el, 'iframe') && data.videoEmbed) {
    const bridge = createPlayerBridge(el, data.videoEmbed)
    state.bridges.set(el, bridge)
    // The open choreography holds its poster cover until frames render.
    playingSignal.set(
      el,
      new Promise((resolve) => {
        bridge.onPlaying(resolve)
      })
    )
    if (autoplay) {
      // An embed armed to autoplay holds the audio focus from the start.
      audioFocus.claim(el, () => {
        state.bridges.get(el)?.setMuted(true)
      })
    }
  } else if (isTagElement(el, 'video')) {
    playingSignal.set(
      el,
      new Promise((resolve) => {
        el.addEventListener('playing', () => resolve(), { once: true })
      })
    )
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
 * Slide content: a player or embed for video slides, template markup for
 * html slides. Everything else is PhotoSwipe's own image path.
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
