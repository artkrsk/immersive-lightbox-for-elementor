import type { IMediaController, IMediaState, IOptions, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { registerActivationPlayback } from './activationPlayback'
import { registerSlideContentBuilder } from './buildSlideContent'
import { registerEmbedDisarm } from './disarmEmbedReappend'
import { createMediaController } from './mediaController'
import { registerAspectFit } from './registerAspectFit'
import { registerZoomPolicy } from './registerZoomPolicy'
import { registerDimsUpgrade } from './upgradeGuessedDims'

/**
 * First-class video/html slides on PhotoSwipe's content lifecycle, tiered:
 * adopted page videos (placeholder container — the flight delivers the live
 * element), clone-and-seek for hidden/managed sources, cold players/embeds
 * otherwise. Playback is driven by activation, never by neighbor URLs;
 * embeds are controlled through the readiness-queued player bridge.
 *
 * This is the composition point: the shared state, the registrations that
 * read it, and teardown.
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

  registerZoomPolicy(pswp)
  registerAspectFit(pswp)
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
