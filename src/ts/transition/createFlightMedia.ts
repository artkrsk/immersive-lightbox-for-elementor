import type { TFlightMedia } from '../types/TFlightMedia'

/**
 * The flight's inner element. Always an img clone we build ourselves, so the
 * layer is free to destroy it on unmount and to repoint it mid-flight.
 */
export function createFlightMedia(media: TFlightMedia): HTMLElement {
  const img = document.createElement('img')
  img.alt = ''
  img.src = media.src
  return img
}
