/**
 * Autoplay timer, UI-agnostic: `onAdvance` fires per interval while playing,
 * `onStateChange` reports play/pause flips exactly once each.
 */
export function createSlideshow(
  intervalMs: number,
  onAdvance: () => void,
  onStateChange?: (playing: boolean) => void
): { toggle(): void; stop(): void; isPlaying(): boolean } {
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = (): void => {
    if (!timer) {
      return
    }
    clearInterval(timer)
    timer = null
    onStateChange?.(false)
  }

  const start = (): void => {
    if (timer) {
      return
    }
    timer = setInterval(onAdvance, intervalMs)
    onStateChange?.(true)
  }

  return {
    toggle: () => {
      if (timer) {
        stop()
      } else {
        start()
      }
    },
    stop,
    isPlaying: () => timer !== null
  }
}
