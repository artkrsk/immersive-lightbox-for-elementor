import type { IAdoptedVideo } from '../interfaces'

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
    home: parent instanceof HTMLElement ? parent : null,
    take: () => {
      // Scroll-driven parallax leaves live values on the
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
