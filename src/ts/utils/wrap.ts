/**
 * Vendored from @arts/slider-engine (same author). Double modulo so negative
 * values land in range too — `-1 % 5` is `-1` in JS, not `4`.
 */
export function wrap(value: number, length: number): number {
  return ((value % length) + length) % length
}
