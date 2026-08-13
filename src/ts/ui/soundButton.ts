import type { IMediaController } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const HIDDEN_CLASS = 'arts-lightbox-sound_hidden'

const SOUND_ON_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
const SOUND_OFF_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/**
 * The "enable sound" affordance for video slides: an ambient muted video
 * continues into the lightbox, this button turns its sound on (claiming the
 * single-audio focus). Hidden on non-video slides; reflects the active
 * medium's mute state.
 */
export function registerSoundButton(pswp: PhotoSwipe, media: IMediaController): void {
  pswp.ui?.registerElement({
    name: 'arts-sound',
    className: 'arts-lightbox-sound',
    order: 12,
    isButton: true,
    appendTo: 'bar',
    html: SOUND_OFF_SVG,
    onInit: (el) => {
      const update = (): void => {
        const sound = media.getSound()
        el.classList.toggle(HIDDEN_CLASS, !sound)
        if (sound) {
          el.innerHTML = sound.muted ? SOUND_OFF_SVG : SOUND_ON_SVG
        }
      }
      update()
      pswp.on('change', update)
      // The adopted element arrives via the flight hand-off after open, and
      // audio focus can flip mute behind our back — refresh cheaply.
      pswp.on('zoomPanUpdate', update)
      el.addEventListener('click', () => {
        const sound = media.getSound()
        if (sound) {
          sound.setMuted(!sound.muted)
        }
        update()
      })
    }
  })
}
