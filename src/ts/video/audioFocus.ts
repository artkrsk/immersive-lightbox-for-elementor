/**
 * At most ONE unmuted playing video, ever — the generalized form of the
 * ArtsCustomGallery simultaneous-sound bugfix. Whoever gains sound claims
 * focus; the previous holder's release callback mutes/pauses it. Closing
 * the lightbox releases everything (close never fires contentDeactivate,
 * so this is called explicitly from the close path).
 */
let release: (() => void) | null = null

export const audioFocus = {
  claim(onRelease: () => void): void {
    if (release && release !== onRelease) {
      release()
    }
    release = onRelease
  },
  releaseAll(): void {
    release?.()
    release = null
  }
}
