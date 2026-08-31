import type { IGallery } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { shortestDelta } from '../utils/shortestDelta'
import { onSlidePosition } from './slidePosition'

const ITEM_CLASS = 'arts-lightbox-caption__item'
const TITLE_CLASS = 'arts-lightbox-caption__title'
const DESCRIPTION_CLASS = 'arts-lightbox-caption__description'

/** One line of an item, or nothing — a line never renders empty. */
function appendLine(item: HTMLElement, className: string, text: string | undefined): void {
  if (!text) {
    return
  }
  const line = document.createElement('span')
  line.className = className
  line.textContent = text
  item.appendChild(line)
}

/**
 * Handoff knob. At 0.5 one caption reaches the edge exactly as the next
 * arrives — no overlap, no gap; above it they cross, below it nothing is on
 * screen mid-transition. Peak simultaneous opacity is `1 - 0.5 / WINDOW`, so
 * 0.55 measured out at 9% — a cut in practice. 0.66 gives 24%, a visible but
 * restrained cross.
 */
const WINDOW = 0.66

/** 103 rather than 100: the 3% overshoot keeps a sub-pixel edge from showing. */
const HIDDEN_SHIFT = 103

/**
 * Bottom-left captions, projected from the live slide position rather than
 * played on a change event — so they move WITH the slide instead of after it,
 * and their direction is the sign of the distance rather than a flag.
 *
 * Every captioned slide gets its own element up front and keeps it. Nothing is
 * measured and nothing is sequenced; each element's offset and opacity are a
 * pure function of how far it sits from where the gallery currently is.
 */
export function registerCaption(pswp: PhotoSwipe, gallery: IGallery): void {
  pswp.ui?.registerElement({
    name: 'arts-caption',
    className: 'arts-lightbox-caption',
    order: 30,
    appendTo: 'root',
    onInit: (el) => {
      const total = gallery.slides.length
      // Sparse on purpose: a slide with neither line contributes no element,
      // which is the entirety of our empty-caption handling. Two lines, as
      // native shows them — the title and, below it, the description; a
      // description alone keeps its own line rather than standing in as the
      // title.
      const items: { index: number; node: HTMLElement; painted: number }[] = []
      gallery.slides.forEach((slide, index) => {
        if (!slide.caption && !slide.description) {
          return
        }
        const node = document.createElement('span')
        node.className = ITEM_CLASS
        appendLine(node, TITLE_CLASS, slide.caption)
        appendLine(node, DESCRIPTION_CLASS, slide.description)
        el.appendChild(node)
        // NaN so the first pass always writes — every other value compares equal
        // to itself, which is what lets the write be skipped later.
        items.push({ index, node, painted: Number.NaN })
      })
      if (items.length === 0) {
        return
      }

      const loop = pswp.canLoop()
      onSlidePosition(pswp, (position) => {
        for (const item of items) {
          const delta = loop ? shortestDelta(item.index, position, total) : item.index - position
          const t = Math.max(-1, Math.min(1, delta / WINDOW))
          // Everything out of range clamps to the same ±1 and would be written
          // identical values every frame — on a gallery with many captions that
          // is most of the work. Clamping is what makes the comparison cheap
          // and exact, so only the two or three items actually in motion write.
          if (t === item.painted) {
            continue
          }
          item.painted = t
          item.node.style.setProperty('--arts-lightbox-caption-shift', String(-t * HIDDEN_SHIFT))
          item.node.style.setProperty('--arts-lightbox-caption-fade', String(1 - Math.abs(t)))
        }
      })
    }
  })
}
