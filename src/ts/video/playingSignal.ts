const signals = new WeakMap<HTMLElement, Promise<void>>()

/**
 * Per-element "frames are actually rendering" promises, set by the content
 * layer when it builds a player (bridge playing event for embeds, the native
 * `playing` event for hosted video) and read by the open choreography to
 * time the flight's departure — the poster keeps covering the player until
 * something real is underneath. A WeakMap registry rather than an engine
 * surface: the two layers stay uncoupled, and entries die with elements.
 */
export const playingSignal = {
  set(el: HTMLElement, signal: Promise<void>): void {
    signals.set(el, signal)
  },
  get(el: HTMLElement): Promise<void> | undefined {
    return signals.get(el)
  }
}
