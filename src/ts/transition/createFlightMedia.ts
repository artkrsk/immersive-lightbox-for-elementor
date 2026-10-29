import type { TFlightMedia } from '../types/TFlightMedia'

/**
 * The flight's inner element. Always an img clone we build ourselves, so the
 * layer is free to destroy it on unmount.
 *
 * `decoding: sync` opts the clone out of Chromium's checker-imaging: an image
 * hinted async that the compositor has not decoded yet is rastered as a blank
 * tile and filled in a few frames later — in a flight that is a see-through
 * frame exactly where the picture should be. The file is already decoded (the
 * page shows it, or the warm-up finished), so the sync hint costs nothing.
 */
export function createFlightMedia(media: TFlightMedia): HTMLElement {
  const img = document.createElement('img')
  img.alt = ''
  img.decoding = 'sync'
  img.src = media.src
  return img
}
