/**
 * Readiness-queued control surface over an embed player iframe. Commands
 * sent before the provider confirms readiness are queued, never dropped;
 * readiness resets on every iframe load (re-appends reload the document).
 */
export interface IPlayerBridge {
  play(): void
  pause(): void
  setMuted(muted: boolean): void
  /** Fires once per iframe load, when the provider reports actual playback. */
  onPlaying(callback: () => void): void
  destroy(): void
}
