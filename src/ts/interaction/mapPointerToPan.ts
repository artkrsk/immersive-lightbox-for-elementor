const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * Maps a normalized viewport pointer position onto PhotoSwipe's pan range.
 * Pointer at the left/top edge reveals the image's left/top (pan = bounds.max,
 * the largest translate); right/bottom edge reveals the opposite end.
 */
export function mapPointerToPan(
  pointer01: { x: number; y: number },
  bounds: { max: { x: number; y: number }; min: { x: number; y: number } }
): { x: number; y: number } {
  return {
    x: bounds.max.x + (bounds.min.x - bounds.max.x) * clamp01(pointer01.x),
    y: bounds.max.y + (bounds.min.y - bounds.max.y) * clamp01(pointer01.y)
  }
}
