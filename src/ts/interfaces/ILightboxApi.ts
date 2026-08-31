/**
 * Navigation surface handed to the UI layer. Everything routes through here
 * (never straight to pswp) so the close choreography applies to every control
 * uniformly.
 */
export interface ILightboxApi {
  close(): void
  next(): void
  prev(): void
  goTo(index: number): void
}
