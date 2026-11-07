import { FRAME_60 } from '../constants'

/**
 * Frame-rate-corrected exponential smoothing: the fraction of the remaining
 * distance to cover over `dt` ms, for a `rate` expressed per 60 Hz frame.
 * Twin of the Cursor Follower's `utils/lerpFactor.ts`; the plugins share no package.
 */
export const lerpFactor = (rate: number, dt: number): number =>
  rate >= 1 ? 1 : 1 - (1 - rate) ** (dt / FRAME_60)
