/** Sound control surface for the ACTIVE slide, consumed by the UI layer. */
export interface IMediaController {
  pauseAll(): void
  getSound(): { muted: boolean; setMuted(muted: boolean): void } | null
}
