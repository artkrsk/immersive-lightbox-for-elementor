/**
 * The one-clock rule: a single rAF progress driver per transition — backdrop,
 * flight and chrome all read the same eased value, so nothing can drift.
 */
export function createClock(
  durationMs: number,
  ease: (t: number) => number,
  onFrame: (eased: number, raw: number) => void,
  onDone: () => void
): { cancel(): void } {
  const start = performance.now()
  let cancelled = false
  const step = (now: number) => {
    if (cancelled) {
      return
    }
    const raw = Math.min(1, Math.max(0, (now - start) / durationMs))
    onFrame(ease(raw), raw)
    if (raw < 1) {
      requestAnimationFrame(step)
    } else {
      onDone()
    }
  }
  requestAnimationFrame(step)
  return {
    cancel: () => {
      cancelled = true
    }
  }
}
