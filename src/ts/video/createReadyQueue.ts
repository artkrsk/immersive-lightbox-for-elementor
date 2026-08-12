/**
 * Commands sent before an embed player's message listener is up are silently
 * dropped — exactly the just-opened slide's case. Everything queues until
 * readiness is confirmed, then flushes in order.
 */
export function createReadyQueue(post: (message: string) => void): {
  send(message: string): void
  /** Idempotent: the first call flushes, later ones are no-ops. */
  markReady(): void
  /** A re-appended iframe reloads into a FRESH player document; pending
   *  commands survive the reload and flush against the new one. */
  reset(): void
  clear(): void
} {
  let ready = false
  let queue: string[] = []

  return {
    send: (message) => {
      if (ready) {
        post(message)
      } else {
        queue.push(message)
      }
    },
    markReady: () => {
      if (ready) {
        return
      }
      ready = true
      for (const message of queue) {
        post(message)
      }
      queue = []
    },
    reset: () => {
      ready = false
    },
    clear: () => {
      queue = []
    }
  }
}
