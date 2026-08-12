import { VIMEO_PATTERN, YOUTUBE_PATTERN } from '../constants'
import type { ISlideData } from '../interfaces'

/**
 * The playable element for a video slide: a native `<video>` for self-hosted
 * files, a privacy-friendly provider iframe (with the JS API enabled so
 * activate/deactivate can drive play/pause) for embeds.
 */
export function buildVideoElement(data: ISlideData): HTMLElement {
  const url = data.videoSrc ?? data.src
  if (data.videoEmbed === 'youtube') {
    const id = YOUTUBE_PATTERN.exec(url)?.[1] ?? ''
    return buildIframe(`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0`)
  }
  if (data.videoEmbed === 'vimeo') {
    const id = VIMEO_PATTERN.exec(url)?.[1] ?? ''
    // api=1 enables the postMessage play/pause control; dnt disables tracking.
    return buildIframe(`https://player.vimeo.com/video/${id}?api=1&dnt=1`)
  }
  const video = document.createElement('video')
  video.src = url
  video.setAttribute('controls', '')
  video.setAttribute('playsinline', '')
  video.preload = 'metadata'
  return video
}

function buildIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.src = src
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture')
  iframe.setAttribute('allowfullscreen', '')
  iframe.setAttribute('frameborder', '0')
  return iframe
}
