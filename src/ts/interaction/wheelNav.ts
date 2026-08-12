import type { IOptions } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'
import { createWheelPhases } from './createWheelPhases'

/**
 * Photos.app-grade trackpad swipes, reconstructed from wheel events — the
 * scroll-phase machine lives in createWheelPhases; this is the gating and the
 * event wiring.
 *
 * Vertical wheel stays inert (mousemove owns panning); ctrl+wheel — the
 * trackpad pinch — remains PhotoSwipe's zoom.
 */
export function attachWheelNav(pswp: PhotoSwipe, opts: IOptions): void {
  if (!opts.explore.enabled || opts.zoom.wheelToZoom) {
    return
  }
  if (!window.matchMedia('(pointer: fine)').matches) {
    return
  }

  const phases = createWheelPhases(pswp)

  pswp.on('wheel', (e) => {
    const wheel = e.originalEvent
    if (wheel.ctrlKey) {
      return // trackpad pinch → stock zoom
    }
    e.preventDefault() // wheel never pans; mousemove owns panning
    phases.onWheel(wheel, performance.now())
  })

  // Any non-wheel input proves the fingers left the glass: the cursor can't
  // move and keys/pointers can't act while two fingers are scrolling. With
  // these, the safety timeout only covers "quiet lift, then hands fully off".
  const onOtherInput = phases.onOtherInput
  pswp.on('bindEvents', () => {
    pswp.element?.addEventListener('mousemove', onOtherInput, { passive: true })
    document.addEventListener('keydown', onOtherInput, { capture: true, passive: true })
    document.addEventListener('pointerdown', onOtherInput, { capture: true, passive: true })
  })
  pswp.on('destroy', () => {
    phases.destroy()
    document.removeEventListener('keydown', onOtherInput, { capture: true })
    document.removeEventListener('pointerdown', onOtherInput, { capture: true })
  })
}
