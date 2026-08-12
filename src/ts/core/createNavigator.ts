import { neighborGallery } from '../collector/buildGalleries'
import type { IGallery, IOpenRequest, IOptions } from '../interfaces'
import { engineState } from './engineState'

/**
 * Slide navigation with pass-through: at a gallery boundary, jump to the
 * neighbor gallery (instant swap — the backdrop stays visually continuous).
 * Inside a gallery, the animated path is the main scroll's own spring, the
 * same one drag gestures use — pswp.next()/goTo() hard-cut (upstream #2175).
 */
export function createNavigator(deps: {
  opts: IOptions
  getCurrent(): { req: IOpenRequest; galleries: IGallery[] } | null
  openInstant(req: IOpenRequest, galleries: IGallery[]): void
}): { nav(dir: 1 | -1): void; goTo(index: number): void } {
  const nav = (dir: 1 | -1): void => {
    const pswp = engineState.pswp
    const current = deps.getCurrent()
    if (!pswp || !current) {
      return
    }
    const { req, galleries } = current
    const lastIndex = req.gallery.slides.length - 1
    const atBoundary = dir === 1 ? pswp.currIndex >= lastIndex : pswp.currIndex <= 0
    if (deps.opts.gallery.passThrough && atBoundary) {
      const neighbor = neighborGallery(req.gallery, galleries, dir)
      const index = dir === 1 ? 0 : (neighbor?.slides.length ?? 1) - 1
      const key = neighbor?.slides[index]?.key
      const sourceElement = key ? neighbor?.elementsByKey.get(key)?.[0] : undefined
      if (neighbor && sourceElement) {
        // The old core is destroyed without choreography and the neighbor
        // opens fully up.
        pswp.destroy()
        deps.openInstant({ gallery: neighbor, index, sourceElement }, galleries)
        return
      }
    }
    pswp.mainScroll.moveIndexBy(dir, true)
  }

  return {
    nav,
    goTo: (index) => {
      const pswp = engineState.pswp
      if (pswp) {
        pswp.mainScroll.moveIndexBy(index - pswp.currIndex, true)
      }
    }
  }
}
