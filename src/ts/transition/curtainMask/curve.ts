/**
 * Vendored from Velum's @arts/curtain-mask (same author). Keep byte-parity
 * with its curve tests — tests/transition/curve.test.ts carries the exact
 * extraction vectors; a change that shifts any output string is a visual
 * change in disguise.
 *
 * Curtain geometry in normalized [0,1]² coordinates (objectBoundingBox) —
 * zero layout reads by construction, pure `(t, bow, direction)` in →
 * path/inset out.
 *
 * `direction` = the edge the revealed region GROWS FROM. The leading edge
 * sits at the t-mapped coordinate and bows toward the unrevealed side by
 * `bow`, sin-shaped along the cross axis — center leads, corners trail
 * (the Asli hem).
 */

export type TCurtainDirection = 'left' | 'right' | 'top' | 'bottom'

export const DEFAULT_POINTS = 20

/** Per-direction geometry: edge coordinate from t, bow sign toward the
 *  unrevealed side, and the two corners that close the revealed region. */
const GEOMETRY: Record<
  TCurtainDirection,
  { horizontalEdge: boolean; edge: (t: number) => number; bowSign: number; close: string }
> = {
  right: { horizontalEdge: false, edge: (t) => 1 - t, bowSign: -1, close: 'L1,1 L1,0 Z' },
  left: { horizontalEdge: false, edge: (t) => t, bowSign: 1, close: 'L0,1 L0,0 Z' },
  bottom: { horizontalEdge: true, edge: (t) => 1 - t, bowSign: -1, close: 'L1,1 L0,1 Z' },
  top: { horizontalEdge: true, edge: (t) => t, bowSign: 1, close: 'L1,0 L0,0 Z' }
}

export function curvedEdgePath(
  t: number,
  bow: number,
  direction: TCurtainDirection = 'right',
  points: number = DEFAULT_POINTS
): string {
  const g = GEOMETRY[direction]
  const edge = g.edge(t)
  const parts: string[] = []
  for (let i = 0; i <= points; i++) {
    const cross = i / points
    const main = clamp01(edge + g.bowSign * bow * Math.sin(Math.PI * cross))
    const x = g.horizontalEdge ? cross : main
    const y = g.horizontalEdge ? main : cross
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(4)},${y.toFixed(4)}`)
  }
  return `${parts.join(' ')} ${g.close}`
}

/** Straight edge — a cheap basic shape (faster paint path than url() in
 *  Chromium; also the bow-0 degenerate case). */
export function straightInset(t: number, direction: TCurtainDirection = 'right'): string {
  const pct = `${((1 - t) * 100).toFixed(3)}%`
  switch (direction) {
    case 'right': {
      return `inset(0 0 0 ${pct})`
    }
    case 'left': {
      return `inset(0 ${pct} 0 0)`
    }
    case 'bottom': {
      return `inset(${pct} 0 0 0)`
    }
    case 'top': {
      return `inset(0 0 ${pct} 0)`
    }
  }
}

/** Fixed bow profile for timeline-driven consumers (no velocity source):
 *  zero at the endpoints, `strength` mid-flight. */
export function bellBow(t: number, strength: number): number {
  return strength * Math.sin(Math.PI * clamp01(t))
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
