import type { IGallery } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { shortestDelta } from '../utils/shortestDelta'

const ITEM_CLASS = 'arts-lightbox-caption__item'

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
      // Sparse on purpose: a slide without a caption contributes no element,
      // which is the entirety of our empty-caption handling.
      const items: { index: number; node: HTMLElement; painted: number }[] = []
      gallery.slides.forEach((slide, index) => {
        if (!slide.caption) {
          return
        }
        const node = document.createElement('span')
        node.className = ITEM_CLASS
        node.textContent = slide.caption
        el.appendChild(node)
        // NaN so the first pass always writes — every other value compares equal
        // to itself, which is what lets the write be skipped later.
        items.push({ index, node, painted: Number.NaN })
      })
      if (items.length === 0) {
        return
      }

      const paint = (): void => {
        const { mainScroll } = pswp
        // Zero until init runs updateSize; also guards the division.
        if (!mainScroll?.slideWidth) {
          return
        }
        // potentialIndex, NOT currIndex. moveIndexBy moves potentialIndex and
        // _currPositionIndex in the same breath, so this offset stays a small
        // fraction; currIndex only lands in updateCurrItem at spring
        // completion, which would make the position jump on commit.
        //
        // Reading the difference rather than x also sidesteps x being an
        // unbounded accumulator that silently rebases every ~50 navigations.
        const offset = (mainScroll.x - mainScroll.getCurrSlideX()) / mainScroll.slideWidth
        const position = pswp.potentialIndex - offset
        const loop = pswp.canLoop()
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
      }

      // Always a no-op on a fresh core — uiRegister fires from
      // _createMainStructure, before updateSize gives slideWidth a value — but
      // it costs nothing and stops the module depending on that ordering.
      paint()
      // moveMainScroll is PhotoSwipe's own per-frame signal — it fires for
      // drag, wheel-nav and the animated snap alike, but is silent at rest.
      pswp.on('moveMainScroll', paint)
      // Belt and braces for any index change that arrives without motion. The
      // spring's terminal frame already reports the exact resting position, so
      // this is normally redundant — and the skip above makes a redundant pass
      // cost nothing, which is why it stays.
      pswp.on('change', paint)
    }
  })
}
