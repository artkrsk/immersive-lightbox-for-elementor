import type { ISoundSurface } from '../interfaces'
import { audioFocus } from '../video/audioFocus'

/**
 * Sound over a real video element — adopted from the page, or a cold/cloned
 * player. Unmuting claims the audio focus and resumes playback; eviction
 * re-mutes rather than pausing, so an adopted video keeps running silently
 * instead of stalling on the page it will return to.
 */
export function videoElementSound(el: HTMLVideoElement): ISoundSurface {
  return {
    muted: el.muted,
    setMuted: (muted) => {
      el.muted = muted
      if (!muted) {
        audioFocus.claim(el, () => {
          el.muted = true
        })
        void el.play().catch(() => {})
      }
    }
  }
}
