import type { IOpenRequest, IOptions } from '../interfaces'
import PhotoSwipe from '../photoswipe/photoswipe.js'
import { engineState } from './engineState'
import { mapToPswpOptions } from './mapToPswpOptions'

/**
 * Constructs and opens a fresh PhotoSwipe core for one open cycle.
 * `configure` runs between construction and init — that's where the
 * transition engine and any option overrides needing closures attach.
 *
 * Desktop drag: the Gestures constructor force-disables `allowPanToNext` for
 * non-touch devices, but its only consumer reads the option live during the
 * drag — so flipping it back after construction (before any drag can start)
 * re-enables mouse-drag between slides without patching the source.
 */
export function createPswp(
  opts: IOptions,
  req: IOpenRequest,
  configure?: (pswp: PhotoSwipe) => void
): PhotoSwipe {
  const pswp = new PhotoSwipe(mapToPswpOptions(opts, req.gallery, req.index))
  if (opts.desktopDrag) {
    pswp.on('beforeOpen', () => {
      pswp.options.allowPanToNext = true
    })
  }
  pswp.on('destroy', () => {
    if (engineState.pswp === pswp) {
      engineState.pswp = null
      engineState.closeHandle = null
    }
  })
  engineState.pswp = pswp
  configure?.(pswp)
  pswp.init()
  return pswp
}
