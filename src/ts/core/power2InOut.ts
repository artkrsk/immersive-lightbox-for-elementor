/** Standard symmetric curve used by transition defaults and aimed zoom. */
export const power2InOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
