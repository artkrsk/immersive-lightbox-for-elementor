import type { TCloseDirection } from '../types/TCloseDirection'
import type { TCurtainEdge } from '../types/TCurtainEdge'
import type { TEasingName } from '../types/TEasingName'
import type { TThumbnailsPosition } from '../types/TThumbnailsPosition'
import type { TTransitionPreset } from '../types/TTransitionPreset'
import type { TZoomMode } from '../types/TZoomMode'

/**
 * The engine's full options surface, derived 1:1 from Elementor kit settings
 * on both the PHP (`Options::build`) and TS sides — the parity invariant
 * `tests/ts/phpDefaultsParity.test.ts` enforces on the defaults. Additive
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
    /** One answer to "what does zoom do here"; every other key refines it. */
    mode: TZoomMode
    /**
     * 'fit' only: how far in zoom goes — click, double-tap, pinch and wheel
     * all stop here — as a multiple of the fitted size, never past the
     * image's own pixels.
     */
    level: number
    /** Plain wheel zooms instead of navigating. Trackpad pinch always zooms. */
    wheelToZoom: boolean
  }
  gallery: {
    /**
     * Every candidate on the page joins one gallery in DOM order, so
     * navigation runs straight through what would otherwise be separate
     * galleries — and the counter, arrows and thumbnails span the page.
     */
    uniteAll: boolean
    loop: boolean
  }
  ui: {
    thumbnails: boolean
    /** Which edge the strip rides; orientation follows from it. */
    thumbnailsPosition: TThumbnailsPosition
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
  prefetch: {
    /** Warm the full-size image on thumbnail hover / press, pre-open. */
    onHover: boolean
  }
  video: {
    /** Video slides play on open and on arrival, unmuted where the browser
     *  allows it. Off leaves every player waiting for a manual press. */
    autoplay: boolean
  }
  elementor: {
    /**
     * Replicate Elementor's client-side bare-image-link fallback: any plain
     * `<a href="….jpg">` becomes a candidate. PHP resolves the kit's
     * `global_image_lightbox` switch into this; outside WordPress there is
     * no kit to honor, hence the false default.
     */
    nativeFallback: boolean
  }
  /** Mouse-drag swipes between slides on desktop. */
  desktopDrag: boolean
}
