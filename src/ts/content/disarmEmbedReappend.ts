import type PhotoSwipe from '../photoswipe/photoswipe.js'

/**
 * PhotoSwipe re-appends CACHED content as slides re-enter the preload
 * window, and re-appending an iframe reloads it. The first append is the
 * watch-intent one (armed URL welcome); every later one must load the
 * disarmed URL — set BEFORE insertion, so there is exactly one load.
 */
export function registerEmbedDisarm(pswp: PhotoSwipe): void {
  pswp.on('contentAppend', (e) => {
    const el = e.content.element
    if (!(el instanceof HTMLIFrameElement) || !el.dataset.artsCleanSrc) {
      return
    }
    if (el.dataset.artsServed) {
      el.src = el.dataset.artsCleanSrc
    } else {
      el.dataset.artsServed = '1'
    }
  })
}
