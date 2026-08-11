/**
 * Navigation surface handed to the UI layer. Everything routes through here
 * (never straight to pswp) so pass-through navigation and the close
 * choreography apply to every control uniformly.
 */
export interface ILightboxApi {
  close(): void
  next(): void
  prev(): void
  goTo(index: number): void
}
