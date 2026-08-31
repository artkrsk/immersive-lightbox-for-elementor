/** The lightbox backdrop, driven by the shared transition clock. */
export interface IBackdrop {
  paint(t: number, closing: boolean): void
  /** 'through' close re-points the curtain so it exits out the top. */
  beginClose(): void
  destroy(): void
}
