import type { TCloseDirection } from '../types/TCloseDirection'
import type { TCurtainEdge } from '../types/TCurtainEdge'
import type { TEasingName } from '../types/TEasingName'
import type { TImageClickAction } from '../types/TImageClickAction'
import type { TSlideChangeStyle } from '../types/TSlideChangeStyle'
import type { TTransitionPreset } from '../types/TTransitionPreset'

/**
 * The engine's full options surface. Phase 2 derives this 1:1 from Elementor
 * kit settings on both the PHP and TS sides (parity invariant) — additive
 * changes only once released.
 */
export interface IOptions {
  transition: {
    preset: TTransitionPreset
    edge: TCurtainEdge
    close: TCloseDirection
    /** Milliseconds. */
    duration: number
    easing: TEasingName
    /** Peak curvature of the curtain's leading edge (0 = flat). */
    bow: number
  }
  explore: {
    /** Mousemove pans the zoomed slide (pointer-fine devices only). */
    enabled: boolean
    /** Per-frame lerp factor toward the pointer-mapped pan target (0..1). */
    smoothing: number
  }
  zoom: {
    imageClickAction: TImageClickAction
    wheelToZoom: boolean
  }
  slideChange: TSlideChangeStyle
  gallery: {
    /** Every candidate on the page joins one gallery in DOM order. */
    uniteAll: boolean
    /** Navigation past a gallery's end continues into the next gallery. */
    passThrough: boolean
    loop: boolean
  }
  ui: {
    thumbnails: boolean
    download: boolean
    counter: boolean
    captions: boolean
    /** Opacity of our backdrop element (PhotoSwipe's own bg is suppressed). */
    backdropOpacity: number
  }
  slideshow: {
    enabled: boolean
    /** Milliseconds between auto-advances. */
    interval: number
  }
  /** Mouse-drag swipes between slides on desktop. */
  desktopDrag: boolean
}
