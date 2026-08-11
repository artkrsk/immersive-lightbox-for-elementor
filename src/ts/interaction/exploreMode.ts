import type PhotoSwipe from 'photoswipe'
import type { IOptions } from '../interfaces'
import { mapPointerToPan } from './mapPointerToPan'

const FIT_EPSILON = 0.001
const IDLE_DELTA = 0.5

/**
 * The mousemove-pan enhancement: while a slide is zoomed beyond fit on a
 * pointer-fine device, moving the mouse pans the slide — no click-drag
 * needed. A rAF lerp glides toward the pointer-mapped target instead of
 * tracking 1:1; drag-pan keeps working (the loop pauses while a pointer is
 * down so the gesture engine owns the frame).
 */
export function attachExploreMode(pswp: PhotoSwipe, opts: IOptions): void {
  if (!opts.explore.enabled) {
    return
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return
  }

  let target: { x: number; y: number } | null = null
  let rafId = 0
  let pointerDown = false

  const step = (): void => {
    rafId = 0
    const slide = pswp.currSlide
    if (!target || !slide || pointerDown) {
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
    const slide = pswp.currSlide
    if (!slide || pointerDown) {
      return
    }
    if (slide.currZoomLevel <= slide.zoomLevels.fit + FIT_EPSILON) {
      target = null
      return
    }
    target = mapPointerToPan(
      { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
      slide.bounds
    )
    if (!rafId) {
      rafId = requestAnimationFrame(step)
    }
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
  pswp.on('destroy', () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    window.removeEventListener('pointerup', onUp)
  })
}
