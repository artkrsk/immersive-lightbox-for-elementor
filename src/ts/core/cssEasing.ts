import type { TEasingName } from '../types'
import { EASINGS } from './easings'

/**
 * Closest cubic-bezier for each engine curve, for engines without `linear()`.
 * The standard Penner approximations: within a couple of percent of the
 * sampled curve at any point.
 */
const BEZIERS: Record<TEasingName, string> = {
  'power2.inOut': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  'power4.inOut': 'cubic-bezier(0.86, 0, 0.07, 1)',
  'expo.inOut': 'cubic-bezier(1, 0, 0, 1)',
  'expo.out': 'cubic-bezier(0.19, 1, 0.22, 1)',
  'circ.inOut': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)'
}

const LINEAR_SAMPLES = 32

let supportsLinear: boolean | null = null

/**
 * The engine curve as a CSS easing, for an animation the compositor drives
 * beside the JS clock. `linear()` samples the very function the clock runs,
 * so the two stay in step to the pixel; the bezier is the fallback.
 */
export function cssEasing(name: TEasingName): string {
  supportsLinear ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timing-function', 'linear(0, 1)')
  if (!supportsLinear) {
    return BEZIERS[name]
  }
  const ease = EASINGS[name]
  const points: string[] = []
  for (let i = 0; i <= LINEAR_SAMPLES; i++) {
    points.push(ease(i / LINEAR_SAMPLES).toFixed(4))
  }
  return `linear(${points.join(', ')})`
}
