import type { ISoundSurface } from './ISoundSurface'

/** Sound control surface for the ACTIVE slide, consumed by the UI layer. */
export interface IMediaController {
  pauseAll(): void
  getSound(): ISoundSurface | null
}
