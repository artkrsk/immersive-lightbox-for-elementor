/**
 * Image files whose pixels are decoded in this document: what a flight may
 * carry from its first frame, and what the hand-off waits for otherwise.
 *
 * One Image per URL — a warm-up already in flight is shared by every caller,
 * and the element lives in the closure until it settles so GC cannot abort
 * the fetch. Failure resolves rather than rejects: a file that will not
 * decode leaves the flight carrying what it has, it never blocks an open.
 */
const ready = new Set<string>()
const pending = new Map<string, Promise<void>>()

export const decodedImages = {
  has: (src: string): boolean => ready.has(src),
  warm: (src: string): Promise<void> => {
    if (ready.has(src)) {
      return Promise.resolve()
    }
    const inFlight = pending.get(src)
    if (inFlight) {
      return inFlight
    }
    const img = new Image()
    img.src = src
    const decode = typeof img.decode === 'function' ? img.decode() : Promise.resolve()
    const done = decode
      .then(() => {
        ready.add(src)
      })
      .catch(() => {
        // Leaves `has` false: the flight flies what the page shows instead.
      })
      .finally(() => {
        pending.delete(src)
      })
    pending.set(src, done)
    return done
  }
}
