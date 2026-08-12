const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * Maps a normalized viewport pointer position onto PhotoSwipe's pan range.
 * Verified against the live engine: `bounds.min` holds the LARGER translate
 * (0 — image top/left revealed) and `bounds.max` the smaller (negative —
 * image bottom/right revealed); the names are inverted relative to their
 * values. Pointer at the top/left edge reveals the image's top/left.
 */
export function mapPointerToPan(
  pointer01: { x: number; y: number },
  bounds: { max: { x: number; y: number }; min: { x: number; y: number } }
): { x: number; y: number } {
  return {
    x: bounds.min.x + (bounds.max.x - bounds.min.x) * clamp01(pointer01.x),
    y: bounds.min.y + (bounds.max.y - bounds.min.y) * clamp01(pointer01.y)
  }
}
