/** One 60 Hz frame in ms: the unit per-frame lerp factors (`explore.smoothing`)
 *  are tuned in. Elapsed time is converted into it, so every refresh rate
 *  glides like 60 Hz. */
export const FRAME_60 = 1000 / 60

/** Longest elapsed time one glide step may cover, so a stalled frame catches up
 *  instead of snapping. */
export const MAX_STEP_DT = 100
