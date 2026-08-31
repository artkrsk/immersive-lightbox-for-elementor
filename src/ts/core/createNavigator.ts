import { engineState } from './engineState'

/**
 * Slide navigation. The animated path is the main scroll's own spring — the
 * same one drag gestures use — because pswp.next()/goTo() hard-cut (upstream
 * #2175).
 *
 * PhotoSwipe refuses a continuous loop below three slides (`canLoop`), for two
 * independent reasons. Its three holders would have to show one slide on both
 * flanks — at two slides `getLoopedIndex(curr - 1)` and `getLoopedIndex(curr + 1)`
 * resolve to the same index, always — and content is cached per index, so the
 * two would fight over one DOM element. Separately, `moveIndexBy`'s wrap math
 * is degenerate there: +1 and -1 both reduce to a distance of 1, so both mean
 * "forward" and the direction is unrecoverable.
 *
 * So below three the wrap travels back to the other end instead, while
 * `canLoop()` is still false — through the clamped branch, never the wrap math.
 * The direction reads backwards, but a two-slide gallery with Loop on has no
 * dead end. Drag and wheel keep their friction edge: a continuous gesture
 * cannot paint a wrap that cannot be rendered.
 */
export function createNavigator(): { nav(dir: 1 | -1): void; goTo(index: number): void } {
  return {
    nav: (dir) => {
      const pswp = engineState.pswp
      if (!pswp) {
        return
      }
      const total = pswp.getNumItems()
      const atEnd = dir === 1 ? pswp.potentialIndex >= total - 1 : pswp.potentialIndex <= 0
      if (atEnd && total > 1 && pswp.options.loop && !pswp.canLoop()) {
        pswp.mainScroll.moveIndexBy(-dir * (total - 1), true)
        return
      }
      pswp.mainScroll.moveIndexBy(dir, true)
    },
    goTo: (index) => {
      const pswp = engineState.pswp
      if (pswp) {
        pswp.mainScroll.moveIndexBy(index - pswp.currIndex, true)
      }
    }
  }
}
