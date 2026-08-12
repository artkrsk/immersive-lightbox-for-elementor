import type { IMediaController, IMediaState, IOptions, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'
import { registerActivationPlayback } from './activationPlayback'
import { registerSlideContentBuilder } from './buildSlideContent'
import { registerEmbedDisarm } from './disarmEmbedReappend'
import { fitWithin } from './fitWithin'
import { createMediaController } from './mediaController'
import { slideData } from './slideData'
import { registerDimsUpgrade } from './upgradeGuessedDims'

const DEFAULT_ASPECT = 16 / 9

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
  const state: IMediaState = {
    bridges: new Map(),
    bridgeMuted: new Map(),
    watchIntent: { index: openedIndex },
    slideAutoplay: (data: ISlideData) => opts.video.autoplay && data.autoplay !== false
  }

  pswp.addFilter('isContentZoomable', (zoomable, content) => {
    const type = slideData(content).type
    return type === 'video' || type === 'html' ? false : zoomable
  })

  // Video/html slides are FIT-only: the global fill-first zoom model would
  // open them cropped (and clip a video's controls) with no way to pan out.
  pswp.on('zoomLevelsUpdate', (e) => {
    const type = (e.slideData as ISlideData).type
    if (type === 'video' || type === 'html') {
      e.zoomLevels.initial = e.zoomLevels.fit
      e.zoomLevels.secondary = e.zoomLevels.fit
      e.zoomLevels.max = e.zoomLevels.fit
    }
  })

  // Video/html boxes aspect-fit the pan area themselves (PhotoSwipe only
  // sizes images).
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

  registerSlideContentBuilder(pswp, state)
  registerEmbedDisarm(pswp)
  registerDimsUpgrade(pswp)
  registerActivationPlayback(pswp, state)

  const media = createMediaController(pswp, state)

  pswp.on('destroy', () => {
    media.pauseAll()
    for (const bridge of state.bridges.values()) {
      bridge.destroy()
    }
    state.bridges.clear()
    state.bridgeMuted.clear()
  })

  return media
}
