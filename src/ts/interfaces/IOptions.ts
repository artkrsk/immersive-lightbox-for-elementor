import type { TCloseDirection } from '../types/TCloseDirection'
import type { TCurtainEdge } from '../types/TCurtainEdge'
import type { TEasingName } from '../types/TEasingName'
import type { TImageClickAction } from '../types/TImageClickAction'
import type { TInitialZoomLevel } from '../types/TInitialZoomLevel'
import type { TSlideChangeStyle } from '../types/TSlideChangeStyle'
import type { TThumbnailsPosition } from '../types/TThumbnailsPosition'
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
    /** 'fill' opens slides already zoomed to cover — pairs with explore. */
    initialLevel: TInitialZoomLevel
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
    /** Which edge the strip rides; orientation follows from it. */
    thumbnailsPosition: TThumbnailsPosition
    download: boolean
    counter: boolean
    captions: boolean
    /** Opacity of our backdrop element (PhotoSwipe's own bg is suppressed). */
    backdropOpacity: number
    /**
     * Glyph markup for the built-in buttons — swap without replacing DOM.
     * Arrow glyphs are duplicated into the blink layers. `close` defaults to
     * '' (the built-in two-bar form); a non-empty string replaces those bars
     * wholesale, forfeiting their hover cascade.
     */
    icons: {
      prev: string
      next: string
      close: string
    }
  }
  slideshow: {
    enabled: boolean
    /** Milliseconds between auto-advances. */
    interval: number
  }
  prefetch: {
    /** Warm the full-size image on thumbnail hover / press, pre-open. */
    onHover: boolean
  }
  video: {
    /** Video slides play on open/arrival (adopted ones continue muted;
     *  watch-intent links autoplay with sound on the opened slide only). */
    autoplay: boolean
  }
  /** Mouse-drag swipes between slides on desktop. */
  desktopDrag: boolean
}
