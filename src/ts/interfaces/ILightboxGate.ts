export interface ILightboxGate {
  readonly signal: AbortSignal
  init(): void
  /** Cancel loading and dispose the app initialized with this signal. */
  destroy(): void
}
