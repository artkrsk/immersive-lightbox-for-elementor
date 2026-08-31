import type { IMediaController, IMediaState } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { isTagElement } from '../utils/isTagElement'

/**
 * Teardown-path media surface: pause everything that is ours to pause.
 * Sound is not surfaced in our chrome — hosted players carry native
 * controls and embeds their provider chrome, so a lightbox mute button
 * would be a third, redundant control.
 */
export function createMediaController(pswp: PhotoSwipe, state: IMediaState): IMediaController {
  const pauseAll = (): void => {
    for (const bridge of state.bridges.values()) {
      bridge.pause()
    }
    for (const holder of pswp.mainScroll.itemHolders) {
      const el = holder.slide?.content?.element
      if (isTagElement(el, 'video')) {
        el.pause()
      }
    }
  }

  return { pauseAll }
}
