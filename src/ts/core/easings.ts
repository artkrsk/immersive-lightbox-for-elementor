import type { TEasingName } from '../types'

/** GSAP-named curves; numbers validated against the design-phase mockup. */
export const EASINGS: Record<TEasingName, (t: number) => number> = {
  'power2.inOut': (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  'power4.inOut': (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2),
  'expo.inOut': (t) =>
    t === 0 || t === 1 ? t : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  'expo.out': (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  'circ.inOut': (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2
}
