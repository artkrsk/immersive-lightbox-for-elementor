import type { IOptions } from '../interfaces'
import { bellBow, CurtainMask } from './curtainMask'

let maskSeq = 0

/**
 * The lightbox backdrop, driven by the shared transition clock. Curtain
 * preset clips the element with the vendored mask (bow bends mid-flight);
 * fade preset drives opacity. `backdropOpacity` applies to both.
 */
export function createBackdrop(
  pswpRoot: HTMLElement,
  opts: IOptions
): {
  paint(t: number, closing: boolean): void
  beginClose(): void
  destroy(): void
} {
  const { preset, edge, close, bow } = opts.transition
  const el = document.createElement('div')
  el.className = 'arts-lightbox-backdrop'
  pswpRoot.prepend(el)

  let mask: CurtainMask | null = null
  if (preset === 'curtain') {
    mask = new CurtainMask({
      host: pswpRoot,
      id: `arts-lightbox-curtain-${++maskSeq}`,
      direction: 'bottom',
      edgeStyle: edge
    })
    mask.attach(el)
    mask.setProgress(0, 0)
    el.style.opacity = String(opts.ui.backdropOpacity)
  } else {
    el.style.opacity = '0'
  }

  return {
    paint: (t, closing) => {
      if (mask) {
        // Closing bows the other way — the hem trails the retreat.
        mask.setProgress(t, (closing ? -1 : 1) * bellBow(t, bow))
      } else {
        el.style.opacity = String(t * opts.ui.backdropOpacity)
      }
    },
    beginClose: () => {
      // 'through' re-points at full reveal (geometry-identical at t=1),
      // so the curtain exits out the top instead of pulling back down.
      if (mask && close === 'through') {
        mask.setDirection('top')
      }
    },
    destroy: () => {
      mask?.revert()
      mask = null
      el.remove()
    }
  }
}
