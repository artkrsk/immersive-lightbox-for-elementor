import type { IGallery, ILightboxApi, IOptions, ISlideData } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { wrap } from '../utils/wrap'
import { posterUrl } from '../video/posterUrl'
import { vimeoPoster } from '../video/vimeoPoster'
import { onSlidePosition } from './slidePosition'

const ACTIVE_CLASS = 'arts-lightbox-thumbs__item_active'

/** A play triangle, naming the slide's kind. */
const VIDEO_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'

/** The tile's image, however it was come by. */
function thumbnail(src: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = src
  img.alt = ''
  img.loading = 'lazy'
  return img
}

/**
 * The frame that will PLAY, where the provider hands one over without being
 * asked. This outranks `msrc` — the still the link was hung on — which is the
 * one place an author's own image loses. Everywhere else it wins, and rightly:
 * but a strip tile answers "which video is this", while a photo the link
 * happens to sit on answers "which link is this". A gallery of stills with one
 * secret video in it looked like a gallery of stills.
 *
 * YouTube's is a string built from the id, so it is here in time to be the
 * tile. Vimeo's needs a round trip and arrives later (below).
 */
function providerFrame(slide: ISlideData): string | undefined {
  return slide.videoEmbed && slide.videoId
    ? posterUrl({ provider: slide.videoEmbed, id: slide.videoId })
    : undefined
}

/**
 * Vimeo's frame, landing whenever oEmbed answers — on top of whatever the tile
 * was showing, for the reason above.
 *
 * Nothing is unwound if the lightbox closes first: the button is garbage the
 * moment the promise settles, and a lazy <img> that never entered a document
 * never asks for its bytes. Letting the request finish also warms the cache
 * the next open reads.
 */
function fillFromVimeo(button: HTMLButtonElement, slide: ISlideData): void {
  if (slide.videoEmbed !== 'vimeo' || !slide.videoId) {
    return
  }
  vimeoPoster(slide.videoId, slide.videoHash).then((src) => {
    if (src) {
      button.replaceChildren(thumbnail(src))
    }
  })
}

/**
 * Thumbnail strip on any edge: click-to-jump, active state synced, and the
 * scroll position read from the gallery rather than caught up afterwards — so
 * the strip tracks a drag and reverses with it instead of lurching once the
 * slide has already landed. Hidden on touch-width viewports via CSS.
 */
export function registerThumbnailsStrip(
  pswp: PhotoSwipe,
  gallery: IGallery,
  api: ILightboxApi,
  position: IOptions['ui']['thumbnailsPosition']
): void {
  const vertical = position === 'left' || position === 'right'
  pswp.ui?.registerElement({
    name: 'arts-thumbs',
    className: `arts-lightbox-thumbs arts-lightbox-thumbs_${position}`,
    order: 40,
    appendTo: 'root',
    onInit: (el) => {
      const total = gallery.slides.length
      const buttons = gallery.slides.map((slide, i) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'arts-lightbox-thumbs__item'
        const src = providerFrame(slide) ?? slide.msrc
        if (src) {
          button.appendChild(thumbnail(src))
        } else if (slide.type === 'video') {
          // A self-hosted video rarely has a poster to borrow; a play glyph
          // says what the slide is, where a number only said where it sits.
          button.innerHTML = VIDEO_SVG
        } else {
          // html slides have no natural glyph.
          button.textContent = String(i + 1)
        }
        fillFromVimeo(button, slide)
        button.addEventListener('click', () => {
          api.goTo(i)
        })
        el.appendChild(button)
        return button
      })

      let active = -1
      onSlidePosition(pswp, (raw) => {
        const at = wrap(raw, total)

        // The highlight is genuinely discrete — a thumbnail is the current one
        // or it is not — so only the scroll glides.
        const nearest = Math.round(at) % total
        if (nearest !== active) {
          buttons[active]?.classList.remove(ACTIVE_CLASS)
          buttons[nearest]?.classList.add(ACTIVE_CLASS)
          active = nearest
        }

        // Reading this container's own scroll extent, which is unavoidable for
        // centring and is not the "size one element from another" coupling the
        // caption avoids. Items are uniform because we size them.
        const extent = vertical ? el.scrollHeight : el.scrollWidth
        const visible = vertical ? el.clientHeight : el.clientWidth
        const pitch = extent / total
        const target = Math.max(0, Math.min(at * pitch + pitch / 2 - visible / 2, extent - visible))
        if (vertical) {
          el.scrollTop = target
        } else {
          el.scrollLeft = target
        }
      })
    }
  })
}
