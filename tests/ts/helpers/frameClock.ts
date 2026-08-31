import { vi } from 'vitest'

/**
 * Deterministic animation frames. `createClock` reads BOTH
 * `requestAnimationFrame` and `performance.now()`, so stubbing only the
 * scheduler leaves the eased progress racing the wall clock — every frame
 * would land at whatever `raw` the real elapsed time produced, and the
 * assertions would be timing-dependent.
 *
 * `vitest.config.ts` sets `unstubGlobals: true`, so the stubs installed here
 * are torn down between tests without an `afterEach` at the call site.
 */
export function installFrameClock(): {
  /** Advance the clock and run every frame queued so far. */
  step(ms?: number): void
  /** Frames queued but not yet run. */
  pending(): number
} {
  let now = 0
  let queue: FrameRequestCallback[] = []

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb)
    return queue.length
  })
  vi.stubGlobal('performance', { now: () => now })

  return {
    step(ms = 100): void {
      now += ms
      // Swap the queue out first: a callback that schedules another frame
      // must land in the NEXT step, not extend the one being drained.
      const callbacks = queue
      queue = []
      for (const cb of callbacks) {
        cb(now)
      }
    },
    pending: (): number => queue.length
  }
}
