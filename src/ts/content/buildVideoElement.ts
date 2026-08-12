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
  if (opts.autoplay) {
    // Watch intent: the user clicked a video link. Sound on — the click is
    // the gesture. If policy still blocks it, the poster + controls remain.
    video.autoplay = true
  }
  return video
}
