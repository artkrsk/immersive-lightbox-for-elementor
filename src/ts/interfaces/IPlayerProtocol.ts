/** One embed provider's postMessage wire format. */
export interface IPlayerProtocol {
  /** The readiness handshake payload. */
  handshake: string
  /** No load-time ready signal — repeat the handshake until one arrives. */
  pingUntilReady: boolean
  isReadyEvent(event: string | undefined): boolean
  /** Does this parsed message prove frames are actually rendering? */
  isPlayingEvent(data: unknown): boolean
  play(): string
  pause(): string
  setMuted(muted: boolean): string
}
