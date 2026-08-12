/**
 * At most ONE unmuted playing video, ever — the generalized form of the
 * ArtsCustomGallery simultaneous-sound bugfix. Whoever gains sound claims
 * focus; the previous holder's release callback mutes/pauses it. Closing
 * the lightbox releases everything (close never fires contentDeactivate,
 * so this is called explicitly from the close path).
 *
 * Claims carry the sounding element as OWNER: re-claiming by the current
 * holder (a video re-played on every slide arrival) must NOT fire its own
 * stale release — that self-mutes it.
 */
let owner: unknown = null
let release: (() => void) | null = null

export const audioFocus = {
  claim(who: unknown, onRelease: () => void): void {
    if (owner !== who) {
      release?.()
    }
    owner = who
    release = onRelease
  },
  releaseAll(): void {
    release?.()
    release = null
    owner = null
  }
}
