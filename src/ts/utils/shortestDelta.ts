import { wrap } from './wrap'

/**
 * Vendored from @arts/slider-engine (same author). Signed distance around a
 * ring, taking the short way — the sign is what makes direction emergent, so
 * consumers never need a next/prev flag. `to` may be fractional and may sit
 * outside [0, length): it is wrapped first.
 */
export function shortestDelta(from: number, to: number, length: number): number {
  const forward = wrap(to - from, length)
  return forward > length / 2 ? forward - length : forward
}
