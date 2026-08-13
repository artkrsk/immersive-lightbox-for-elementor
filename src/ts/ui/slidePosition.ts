import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * Calls back with the gallery's fractional slide position — 2.4 meaning
 * "40% of the way from slide 2 toward slide 3" — whenever it moves.
 *
 * This is what lets chrome be *read* from the gallery rather than played at
 * it: a consumer recomputes its state from the position each frame, so it
 * moves with a drag, reverses when the drag reverses, and needs no notion of
 * direction or of an animation to interrupt.
 *
 * The value may sit outside `[0, slideCount)` — a loop crossing shifts it by
 * exactly the slide count, and a drag can overshoot — so consumers that care
 * about ring distance must wrap it themselves.
 */
export function onSlidePosition(pswp: PhotoSwipe, paint: (position: number) => void): void {
  const emit = (): void => {
    const { mainScroll } = pswp
    // Zero until init runs updateSize; also guards the division.
    if (!mainScroll?.slideWidth) {
      return
    }
    // potentialIndex, NOT currIndex. moveIndexBy moves potentialIndex and
    // _currPositionIndex in the same breath, so this offset stays a small
    // fraction; currIndex only lands in updateCurrItem at spring completion,
    // which would make the position jump on commit — on every navigation.
    //
    // Reading the difference rather than x also sidesteps x being an unbounded
    // accumulator that silently rebases every ~50 navigations.
    const offset = (mainScroll.x - mainScroll.getCurrSlideX()) / mainScroll.slideWidth
    paint(pswp.potentialIndex - offset)
  }

  // Always a no-op on a fresh core — uiRegister fires from
  // _createMainStructure, before updateSize gives slideWidth a value — but it
  // costs nothing and stops consumers depending on that ordering.
  emit()
  // moveMainScroll is PhotoSwipe's own per-frame signal — it fires for drag,
  // wheel-nav and the animated snap alike, but is silent at rest.
  pswp.on('moveMainScroll', emit)
  // Belt and braces for any index change arriving without motion. The spring's
  // terminal frame already reports the exact resting position, so this is
  // normally redundant — consumers are expected to make a repeat cheap.
  pswp.on('change', emit)
}
