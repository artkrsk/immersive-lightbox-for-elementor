/**
 * True playback continuation for self-hosted background videos: the page's
 * live <video> element is ADOPTED into the lightbox and returned on close.
 * Same-task DOM moves never pause a media element (WHATWG r5899), so the
 * playhead, buffer and decode pipeline all continue — the seamlessness
 * iframes can never have (reparenting reloads them).
 */

/**
 * A genuinely visible, sourced <video> inside the candidate. The WebGL
 * widgets' texture-source videos are display:none and fail this by
 * construction — those fall back to clone-and-seek.
 */
export function findAdoptableVideo(candidate: HTMLElement): HTMLVideoElement | null {
  const video = candidate.querySelector('video')
  if (!video) {
    return null
  }
  if (!video.currentSrc && !video.getAttribute('src')) {
    return null
  }
  const style = getComputedStyle(video)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return null
  }
  const rect = video.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) {
    return null
  }
  return video
}
