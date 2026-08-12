import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { createAimedZoomToggle } from './createAimedZoomToggle'
import { mapPointerToPan } from './mapPointerToPan'

const FIT_EPSILON = 0.001
const IDLE_DELTA = 0.5
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
 * needed. A rAF lerp glides toward the pointer-mapped target instead of
 * tracking 1:1. Also owns the click zoom toggle so zooming and panning are
 * one continuous mouse-aimed function instead of two competing writers.
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

  // Seed the initial pan from the opening click. The fork's
  // zoomAndPanToInitial honors this on every re-init — image appends and
  // resizes keep aiming at it — until the user takes over with a mousemove
  // or changes slides.
  const options = pswp.options
  const clearSeed = (): void => {
    if (options.artsSeedPan) {
      Reflect.deleteProperty(options, 'artsSeedPan')
    }
  }
  if (seedPoint) {
    options.artsSeedPan = { ...pointer01 }
    pswp.on('change', clearSeed)
  }

  let target: { x: number; y: number } | null = null
  let rafId = 0
  let pointerDown = false

  const zoom = createAimedZoomToggle(pswp, pointer01, () => {
    // The toggle takes over the aim: glide stops, seed re-inits stop.
    clearSeed()
    target = null
  })

  /** Instantly aim a slide's pan at the pointer (no glide — for slides
   *  nobody is watching yet). No-op below fit, where pan is degenerate. */
  const aimSlide = (slide: NonNullable<PhotoSwipe['currSlide']>): void => {
    if (slide.currZoomLevel <= slide.zoomLevels.fit + FIT_EPSILON) {
      return
    }
    const aimed = mapPointerToPan(pointer01, slide.bounds)
    slide.pan.x = aimed.x
    slide.pan.y = aimed.y
    slide.applyCurrentZoomPan()
  }

  /** Neighbors stay pre-aimed at the pointer, so a swipe lands on a slide
   *  that already agrees with the mouse — no first-mousemove snap. */
  const aimNeighbors = (): void => {
    for (const holder of pswp.mainScroll.itemHolders) {
      if (holder.slide && holder.slide !== pswp.currSlide) {
        aimSlide(holder.slide)
      }
    }
  }

  const step = (): void => {
    rafId = 0
    const slide = pswp.currSlide
    if (!target || !slide || pointerDown || zoom.active()) {
      return
    }
    const dx = target.x - slide.pan.x
    const dy = target.y - slide.pan.y
    if (Math.abs(dx) < IDLE_DELTA && Math.abs(dy) < IDLE_DELTA) {
      return
    }
    slide.panTo(
      slide.pan.x + dx * opts.explore.smoothing,
      slide.pan.y + dy * opts.explore.smoothing
    )
    rafId = requestAnimationFrame(step)
  }

  const onMove = (e: MouseEvent): void => {
    pointer01.x = clamp01(e.clientX / window.innerWidth)
    pointer01.y = clamp01(e.clientY / window.innerHeight)
    const slide = pswp.currSlide
    // While the aimed zoom runs, its clock reads pointer01 directly.
    if (!slide || pointerDown || zoom.active()) {
      return
    }
    if (slide.currZoomLevel <= slide.zoomLevels.fit + FIT_EPSILON) {
      target = null
      return
    }
    // The user took over — initial-pan re-inits stop aiming at the seed.
    clearSeed()
    target = mapPointerToPan(pointer01, slide.bounds)
    if (!rafId) {
      rafId = requestAnimationFrame(step)
    }
    aimNeighbors()
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
      aimSlide(slide)
    }
    aimNeighbors()
  })
  pswp.on('destroy', () => {
    zoom.cancel()
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    window.removeEventListener('pointerup', onUp)
  })

  return { toggleZoomAimed: zoom.toggle }
}
