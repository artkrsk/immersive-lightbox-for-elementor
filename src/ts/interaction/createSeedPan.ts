import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * The initial pan seeded from the opening click. The fork's
 * zoomAndPanToInitial honors this on every re-init — image appends and
 * resizes keep aiming at it — until the user takes over with a mousemove, or
 * the slide changes.
 */
export function createSeedPan(
  pswp: PhotoSwipe,
  pointer01: { x: number; y: number }
): { clear(): void } {
  const options = pswp.options as typeof pswp.options & {
    artsSeedPan?: { x: number; y: number }
  }
  const clear = (): void => {
    if (options.artsSeedPan) {
      Reflect.deleteProperty(options, 'artsSeedPan')
    }
  }
  options.artsSeedPan = { ...pointer01 }
  pswp.on('change', clear)
  return { clear }
}
