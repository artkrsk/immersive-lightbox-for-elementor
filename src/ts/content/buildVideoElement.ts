import type { ISlideData } from '../interfaces'
import { buildEmbedUrl } from '../video/buildEmbedUrl'
import { parseVideoUrl } from '../video/parseVideoUrl'

/**
 * Cold player builders (tier 3 — no page element to adopt or clone): a
 * native `<video>` for self-hosted files, a privacy-first controllable
 * iframe for embeds. `autoplay` only ever true for the actually-opened
 * slide — never for preloaded neighbors (the AGC lesson).
 */
export function buildVideoElement(data: ISlideData, opts: { autoplay: boolean }): HTMLElement {
  const url = data.videoSrc ?? data.src
  const parsed = parseVideoUrl(url)
  if (parsed && (parsed.provider === 'youtube' || parsed.provider === 'vimeo')) {
    const iframe = document.createElement('iframe')
    iframe.src = buildEmbedUrl(parsed, { autoplay: opts.autoplay })
    if (opts.autoplay) {
      // Re-appending an iframe RELOADS it — an armed URL would blast sound
      // from a preloaded neighbor. The content layer swaps to this disarmed
      // URL before any re-append (the AGC bug, iframe flavor).
      iframe.dataset.artsCleanSrc = buildEmbedUrl(parsed, { autoplay: false })
    }
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media')
    iframe.setAttribute('allowfullscreen', '')
    iframe.setAttribute('frameborder', '0')
    return iframe
  }
  const video = document.createElement('video')
  video.src = url
  if (data.msrc) {
    video.poster = data.msrc
  }
  video.setAttribute('controls', '')
  video.setAttribute('playsinline', '')
  video.preload = 'metadata'
  // NO autoplay property, even for the opened slide: it sticks to the
  // element and re-fires on every re-append/rebuild — including when this
  // slide later re-enters the preload window as a NEIGHBOR (the AGC bug).
  // The opened slide plays via contentActivate, inside the click's gesture.
  return video
}
