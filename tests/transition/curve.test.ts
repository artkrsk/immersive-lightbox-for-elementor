import { bellBow, curvedEdgePath, straightInset } from '@ts/transition/curtainMask'
import { describe, expect, it } from 'vitest'

/** Parse "Mx,y Lx,y ..." into numeric [x, y] pairs (corners included). */
function points(d: string): [number, number][] {
  return [...d.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
}

describe('curvedEdgePath', () => {
  it('positions the flat edge per direction and closes through the right corners', () => {
    const right = curvedEdgePath(0.3, 0, 'right')
    expect(
      points(right)
        .slice(0, 21)
        .every(([x]) => Math.abs(x - 0.7) < 1e-9)
    ).toBe(true)
    expect(right.endsWith('L1,1 L1,0 Z')).toBe(true)

    const left = curvedEdgePath(0.3, 0, 'left')
    expect(
      points(left)
        .slice(0, 21)
        .every(([x]) => Math.abs(x - 0.3) < 1e-9)
    ).toBe(true)
    expect(left.endsWith('L0,1 L0,0 Z')).toBe(true)

    const bottom = curvedEdgePath(0.3, 0, 'bottom')
    expect(
      points(bottom)
        .slice(0, 21)
        .every(([, y]) => Math.abs(y - 0.7) < 1e-9)
    ).toBe(true)
    expect(bottom.endsWith('L1,1 L0,1 Z')).toBe(true)

    const top = curvedEdgePath(0.3, 0, 'top')
    expect(
      points(top)
        .slice(0, 21)
        .every(([, y]) => Math.abs(y - 0.3) < 1e-9)
    ).toBe(true)
    expect(top.endsWith('L1,0 L0,0 Z')).toBe(true)
  })

  it('bows toward the unrevealed side (center leads, corners trail)', () => {
    // Cross-axis 0.5 with 20 points = vertex index 10.
    const mid = (d: string): [number, number] => points(d)[10] ?? [Number.NaN, Number.NaN]
    expect(mid(curvedEdgePath(0.3, 0.1, 'right'))[0]).toBeCloseTo(0.6, 10) // x below 0.7
    expect(mid(curvedEdgePath(0.3, 0.1, 'left'))[0]).toBeCloseTo(0.4, 10) // x above 0.3
    expect(mid(curvedEdgePath(0.3, 0.1, 'bottom'))[1]).toBeCloseTo(0.6, 10) // y up
    expect(mid(curvedEdgePath(0.3, 0.1, 'top'))[1]).toBeCloseTo(0.4, 10) // y down
  })

  it('clamps to [0,1] and honors the points param', () => {
    const d = curvedEdgePath(0.02, 0.5, 'right', 8)
    const pts = points(d)
    expect(pts.length).toBe(9 + 2) // points+1 vertices + 2 corners
    expect(pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true)
  })

  it('reproduces the Velum samplers byte-for-byte (extraction parity vectors)', () => {
    // Captured from Velum's curtain-mask tests — the vendored copy must stay
    // visually identical to the theme's overlay menu curtain.
    expect(curvedEdgePath(0.3, 0.05, 'right')).toBe(
      'M0.7000,0.0000 L0.6922,0.0500 L0.6845,0.1000 L0.6773,0.1500 L0.6706,0.2000 L0.6646,0.2500 L0.6595,0.3000 L0.6554,0.3500 L0.6524,0.4000 L0.6506,0.4500 L0.6500,0.5000 L0.6506,0.5500 L0.6524,0.6000 L0.6554,0.6500 L0.6595,0.7000 L0.6646,0.7500 L0.6706,0.8000 L0.6773,0.8500 L0.6845,0.9000 L0.6922,0.9500 L0.7000,1.0000 L1,1 L1,0 Z'
    )
    expect(curvedEdgePath(0.3, 0.05, 'left')).toBe(
      'M0.3000,0.0000 L0.3078,0.0500 L0.3155,0.1000 L0.3227,0.1500 L0.3294,0.2000 L0.3354,0.2500 L0.3405,0.3000 L0.3446,0.3500 L0.3476,0.4000 L0.3494,0.4500 L0.3500,0.5000 L0.3494,0.5500 L0.3476,0.6000 L0.3446,0.6500 L0.3405,0.7000 L0.3354,0.7500 L0.3294,0.8000 L0.3227,0.8500 L0.3155,0.9000 L0.3078,0.9500 L0.3000,1.0000 L0,1 L0,0 Z'
    )
    expect(curvedEdgePath(0.3, 0.05, 'bottom')).toBe(
      'M0.0000,0.7000 L0.0500,0.6922 L0.1000,0.6845 L0.1500,0.6773 L0.2000,0.6706 L0.2500,0.6646 L0.3000,0.6595 L0.3500,0.6554 L0.4000,0.6524 L0.4500,0.6506 L0.5000,0.6500 L0.5500,0.6506 L0.6000,0.6524 L0.6500,0.6554 L0.7000,0.6595 L0.7500,0.6646 L0.8000,0.6706 L0.8500,0.6773 L0.9000,0.6845 L0.9500,0.6922 L1.0000,0.7000 L1,1 L0,1 Z'
    )
    // Negative bow (backward velocity) parity:
    expect(curvedEdgePath(0.7, -0.08, 'right')).toBe(
      'M0.3000,0.0000 L0.3125,0.0500 L0.3247,0.1000 L0.3363,0.1500 L0.3470,0.2000 L0.3566,0.2500 L0.3647,0.3000 L0.3713,0.3500 L0.3761,0.4000 L0.3790,0.4500 L0.3800,0.5000 L0.3790,0.5500 L0.3761,0.6000 L0.3713,0.6500 L0.3647,0.7000 L0.3566,0.7500 L0.3470,0.8000 L0.3363,0.8500 L0.3247,0.9000 L0.3125,0.9500 L0.3000,1.0000 L1,1 L1,0 Z'
    )
  })
})

describe('straightInset', () => {
  it('insets the correct side per direction (parity included)', () => {
    expect(straightInset(0.3, 'right')).toBe('inset(0 0 0 70.000%)')
    expect(straightInset(0.3, 'left')).toBe('inset(0 70.000% 0 0)')
    expect(straightInset(0.3, 'bottom')).toBe('inset(70.000% 0 0 0)')
    expect(straightInset(0.3, 'top')).toBe('inset(0 0 70.000% 0)')
  })
})

describe('bellBow', () => {
  it('is zero at the endpoints, peaks at strength mid-flight, symmetric', () => {
    expect(bellBow(0, 0.1)).toBeCloseTo(0, 12)
    expect(bellBow(1, 0.1)).toBeCloseTo(0, 12)
    expect(bellBow(0.5, 0.1)).toBeCloseTo(0.1, 12)
    expect(bellBow(0.25, 0.1)).toBeCloseTo(bellBow(0.75, 0.1), 12)
    expect(bellBow(-1, 0.1)).toBeCloseTo(0, 12) // clamped input
  })
})
