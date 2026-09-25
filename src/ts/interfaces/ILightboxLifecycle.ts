import type { ILightbox } from './ILightbox'
import type { ILightboxRootPublisher } from './ILightboxRootPublisher'

export interface ILightboxLifecycle {
  roots: ILightboxRootPublisher
  initialized(lightbox: ILightbox): void
  destroying(lightbox: ILightbox): void
  /** False while a later request hands the page back to WooCommerce. */
  isActive(): boolean
}
