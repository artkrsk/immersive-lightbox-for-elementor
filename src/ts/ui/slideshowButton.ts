import type PhotoSwipe from '../photoswipe/photoswipe'
import type { createSlideshow } from './slideshow'

const PLAY_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'
const PAUSE_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg>'

/** Play/pause toggle reflecting the slideshow state. */
export function registerSlideshowButton(
  pswp: PhotoSwipe,
  slideshow: ReturnType<typeof createSlideshow>
): void {
  pswp.ui?.registerElement({
    name: 'arts-slideshow',
    className: 'arts-lightbox-slideshow',
    order: 14,
    isButton: true,
    appendTo: 'bar',
    html: PLAY_SVG,
    onInit: (el) => {
      const render = (): void => {
        el.innerHTML = slideshow.isPlaying() ? PAUSE_SVG : PLAY_SVG
      }
      // Poll-free: re-render after every toggle click and any slideshow stop
      // caused by interaction (pointerdown fires before the click handler).
      pswp.element?.addEventListener('pointerdown', () => {
        requestAnimationFrame(render)
      })
      render()
    },
    onClick: (_e, el) => {
      slideshow.toggle()
      ;(el as HTMLElement).innerHTML = slideshow.isPlaying() ? PAUSE_SVG : PLAY_SVG
    }
  })
}
