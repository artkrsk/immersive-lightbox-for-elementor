/**
 * Ceiling on the gate's speculative warm: how long an idle window is worth
 * waiting for before the engine loads anyway. Also the plain delay where
 * `requestIdleCallback` is missing (Safari below 16.4).
 */
export const PRELOAD_TIMEOUT_MS = 2000
