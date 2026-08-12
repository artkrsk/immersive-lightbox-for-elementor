import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { aimNeighbors, aimSlideAtPointer } from './aimAtPointer'
import { createAimedZoomToggle } from './createAimedZoomToggle'
import { createExploreGlide } from './createExploreGlide'
import { createSeedPan } from './createSeedPan'

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** The explore surface handed back to the composition root. */
export interface IExploreHandle {
  /** The click zoom toggle, aimed at the live mouse (see
   *  createAimedZoomToggle). */
  toggleZoomAimed(): void
}

/**
 * The mousemove-pan enhancement: while a slide is zoomed beyond fit on a
 * pointer-fine device, moving the mouse pans the slide — no click-drag
 * needed. Owns the pointer aim and hands it to three readers (the opening
 * seed, the glide, the zoom toggle) so zooming and panning are one
 * continuous mouse-aimed function instead of two competing writers.
 */
export function attachExploreMode(
  pswp: PhotoSwipe,
  opts: IOptions,
  seedPoint?: { x: number; y: number }
): IExploreHandle | null {
  if (!opts.explore.enabled) {
    return null
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return null
  }

  // The last known viewport-normalized pointer position — the single aim
  // every motion reads: the pan seed, the explore glide, the zoom toggle.
  const pointer01 = { x: 0.5, y: 0.5 }
  if (seedPoint) {
    pointer01.x = clamp01(seedPoint.x / window.innerWidth)
    pointer01.y = clamp01(seedPoint.y / window.innerHeight)
  }
  const clearSeed = seedPoint ? createSeedPan(pswp, pointer01).clear : (): void => {}

  let pointerDown = false
  // The glide and the toggle each gate on the other. `zoom` is read only
  // from inside glide's callbacks, which cannot run before it is assigned.
  let zoom: ReturnType<typeof createAimedZoomToggle>

  const glide = createExploreGlide(pswp, pointer01, opts.explore.smoothing, {
    isBlocked: () => pointerDown || zoom.active(),
    onTakeover: clearSeed
  })

  zoom = createAimedZoomToggle(pswp, pointer01, () => {
    // The toggle takes over the aim: glide stops, seed re-inits stop.
    clearSeed()
    glide.release()
  })

  const onMove = (e: MouseEvent): void => {
    pointer01.x = clamp01(e.clientX / window.innerWidth)
    pointer01.y = clamp01(e.clientY / window.innerHeight)
    // Tracked even while blocked: the aimed zoom's clock reads pointer01
    // directly on every frame.
    glide.aim()
  }
  const onDown = (): void => {
    pointerDown = true
  }
  const onUp = (): void => {
    pointerDown = false
  }

  pswp.on('bindEvents', () => {
    pswp.element?.addEventListener('mousemove', onMove)
    pswp.element?.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
  })
  // Arriving slides agree with the pointer immediately (registered after
  // zoomMode's change sync so the aim wins over its centering), and freshly
  // appended neighbors get aimed too.
  pswp.on('change', () => {
    zoom.cancel()
    const slide = pswp.currSlide
    if (slide) {
      aimSlideAtPointer(slide, pointer01)
    }
    aimNeighbors(pswp, pointer01)
  })
  pswp.on('destroy', () => {
    zoom.cancel()
    glide.destroy()
    window.removeEventListener('pointerup', onUp)
  })

  return { toggleZoomAimed: zoom.toggle }
}
