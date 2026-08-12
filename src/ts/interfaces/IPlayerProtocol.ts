/** One embed provider's postMessage wire format. */
export interface IPlayerProtocol {
  /** The readiness handshake payload. */
  handshake: string
  /** No load-time ready signal — repeat the handshake until one arrives. */
  pingUntilReady: boolean
  isReadyEvent(event: string | undefined): boolean
  play(): string
  pause(): string
  setMuted(muted: boolean): string
}
