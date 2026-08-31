/** Contain-fit a box of the given aspect ratio inside an area. */
export function fitWithin(
  area: { x: number; y: number },
  aspect: number
): { w: number; h: number } {
  const byWidth = { w: area.x, h: area.x / aspect }
  if (byWidth.h <= area.y) {
    return byWidth
  }
  return { w: area.y * aspect, h: area.y }
}
