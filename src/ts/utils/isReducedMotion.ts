import type { IOptions } from '../interfaces'

/**
 * Whether a transition cuts to its end state: the site honours the setting and
 * the visitor's system asks for reduced motion. Read at each decision, never
 * cached, so flipping the system setting reaches the next open, close or click.
 */
export function isReducedMotion(opts: IOptions): boolean {
  return opts.reducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
