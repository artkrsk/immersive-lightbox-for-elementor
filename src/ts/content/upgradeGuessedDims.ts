import type { ISlideData } from '../interfaces'
import type { Content } from '../photoswipe/core/eventable'
import type PhotoSwipe from '../photoswipe/photoswipe'
import type Slide from '../photoswipe/slide/slide'
import { isTagElement } from '../utils/isTagElement'
import { slideData } from './slideData'

interface IBox {
  width: number
  height: number
}

/** Measured naturals of a decoded image, or null while nothing is known. */
function naturals(el: unknown): IBox | null {
  if (!isTagElement(el, 'img') || !el.naturalWidth) {
    return null
  }
  return { width: el.naturalWidth, height: el.naturalHeight }
}

/** Only a guessed box gets replaced — author-declared dims are the truth. */
function upgradeData(data: ISlideData, box: IBox): void {
  if (!data.dimsGuessed) {
    return
  }
  data.width = box.width
  data.height = box.height
  data.dimsGuessed = false
}

/** Copy the data box onto a content or slide. */
function sync(target: IBox, data: ISlideData): boolean {
  if (!data.width || !data.height) {
    return false
  }
  if (target.width === data.width && target.height === data.height) {
    return false
  }
  target.width = data.width
  target.height = data.height
  return true
}

/**
 * Contents outlive the slides that use them — the loader caches them by index,
 * and every holder built for an item copies its box from that cache
 * (`slide.width = content.width`). So a correction has to land on the content
 * too: fixing only the slide let the interim box come back the next time the
 * item got a holder.
 */
function upgradeContent(content: Content, data: ISlideData): void {
  const box = naturals(content.element)
  if (box) {
    upgradeData(data, box)
  }
  sync(content, data)
}

function resize(slide: Slide): void {
  slide.calculateSize()
  slide.zoomAndPanToInitial()
  slide.applyCurrentZoomPan()
  slide.updateContentSize(true)
}

/**
 * Slides whose dims were guessed (from thumb attributes, or absent entirely)
 * upgrade to the real naturals — right aspect was never guaranteed, and
 * PhotoSwipe caps zoom at what it believes is natural size.
 *
 * Two triggers, both needed, because an image can decode on either side of the
 * slide that shows it. `slideInit` catches the already-decoded case: the
 * preloader loads well beyond the holder window and its contents carry no
 * slide, so `loadComplete` never fires for them (Content.onLoaded bails
 * without one) — correcting as the holder is built means the slide is sized
 * right before its first paint instead of resizing once on screen.
 * `loadComplete` catches the other order, an image still decoding when its
 * holder appears.
 */
export function registerDimsUpgrade(pswp: PhotoSwipe): void {
  pswp.on('slideInit', (e) => {
    const data = slideData(e.slide)
    upgradeContent(e.slide.content, data)
    sync(e.slide, data)
  })

  pswp.on('loadComplete', (e) => {
    const data = slideData(e.content)
    upgradeContent(e.content, data)
    if (sync(e.slide, data)) {
      resize(e.slide)
    }
  })
}
