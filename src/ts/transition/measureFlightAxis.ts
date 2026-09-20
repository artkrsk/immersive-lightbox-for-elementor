/** Measures one inner-media axis relative to its visible frame. */
export function measureFlightAxis(
  innerStart: number,
  innerSize: number,
  frameStart: number,
  frameSize: number
): [sizePct: number, offsetPct: number] {
  if (frameSize <= 0 || innerSize <= 0) {
    return [100, 0]
  }
  return [(innerSize / frameSize) * 100, ((innerStart - frameStart) / frameSize) * 100]
}
