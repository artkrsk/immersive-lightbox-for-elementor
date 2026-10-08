import type { ILightbox } from './ILightbox'

export interface ILightboxApp {
  /** Publish the discovery hub and initialize when the document is ready. */
  init(): void
  /** Release this owner. A destroyed handle cannot be initialized again. */
  destroy(): void
  get(): ILightbox | null
}
