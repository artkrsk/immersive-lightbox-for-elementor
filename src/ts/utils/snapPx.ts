// Hand-synced twin of `@arts/velum-component/motion`'s `snapPx` (and of the copies in
// hover-lift, grid-engine, slider-scrub, split-counter): this package imports nothing
// from a theme, so it carries its own. Change them together.

/** `value` on the device-pixel grid. Multiplies, then divides: exact at a ratio of 3. */
export function snapPx(value: number): number {
  const ratio = window.devicePixelRatio || 1
  return Math.round(value * ratio) / ratio
}
