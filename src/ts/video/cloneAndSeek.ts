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
