/**
 * True playback continuation for self-hosted background videos: the page's
 * live <video> element is ADOPTED into the lightbox and returned on close.
 * Same-task DOM moves never pause a media element (WHATWG r5899), so the
 * playhead, buffer and decode pipeline all continue — the seamlessness
 * iframes can never have (reparenting reloads them).
 */

import type { IAdoptedVideo } from '../interfaces'

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

export function adoptVideo(video: HTMLVideoElement): IAdoptedVideo {
  const parent = video.parentNode
  const nextSibling = video.nextSibling
  const cssText = video.style.cssText
  const muted = video.muted
  const controls = video.controls
  const wasPlaying = !video.paused
  let returned = false

  return {
    element: video,
    take: () => {
      // The Velum scroll-driven parallax contract leaves live values on the
      // translate/scale PROPERTIES — pinned here so the video doesn't carry
      // a stale drift/overscan into the lightbox. Restored via cssText.
      video.style.setProperty('translate', '0 0')
      video.style.setProperty('scale', '1')
      video.style.setProperty('transform', 'none')
      // CSS animations OVERRIDE inline pins, and a scroll-driven one whose
      // view-timeline ancestor stayed in the page turns into a finished
      // fill-forwards animation inside the lightbox — permanently offsetting
      // the element. Transitions would lag the flight's per-frame painting.
      video.style.setProperty('animation', 'none')
      video.style.setProperty('transition', 'none')
      return video
    },
    return: () => {
      if (returned) {
        return
      }
      returned = true
      // Mute BEFORE the element re-enters the page — sound must never leak
      // out of the lightbox.
      video.muted = muted
      video.controls = controls
      video.style.cssText = cssText
      if (parent) {
        parent.insertBefore(video, nextSibling)
      }
      if (wasPlaying) {
        void video.play().catch(() => {})
      }
    }
  }
}

/**
 * The middle tier (Masthead's own page-transition strategy): a fresh muted
 * element synced to the hidden source's playhead — for videos that exist
 * but must not be adopted (WebGL texture sources, externally managed).
 */
export function cloneAndSeek(source: HTMLVideoElement): HTMLVideoElement {
  const clone = document.createElement('video')
  clone.src = source.currentSrc || source.src
  const poster = source.poster || source.getAttribute('poster')
  if (poster) {
    clone.poster = poster
  }
  clone.muted = true
  clone.autoplay = true
  clone.playsInline = true
  clone.loop = source.loop
  clone.addEventListener(
    'loadedmetadata',
    () => {
      // Read the source's playhead at sync time — it kept advancing.
      clone.currentTime = source.currentTime
    },
    { once: true }
  )
  void clone.play().catch(() => {})
  return clone
}
