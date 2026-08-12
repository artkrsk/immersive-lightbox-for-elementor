import type { TFlightMedia } from '../types/TFlightMedia'

/**
 * The flight's inner element and whether it is ours. Ownership drives the
 * rest of the layer's lifecycle: an img clone we built can be destroyed on
 * unmount, while a live element is borrowed — it has to survive to be handed
 * back out by extract(), and only it needs the frozen-frame cover.
 */
export function createFlightMedia(media: TFlightMedia): { el: HTMLElement; owned: boolean } {
  if (media.kind === 'img') {
    const img = document.createElement('img')
    img.alt = ''
    img.src = media.src
    return { el: img, owned: true }
  }
  return { el: media.el, owned: false }
}
