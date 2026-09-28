import type { ILightbox } from '../interfaces/ILightbox'
import type { ILightboxChangeDetail } from '../interfaces/ILightboxChangeDetail'
import type { ILightboxEventDetail } from '../interfaces/ILightboxEventDetail'

/** Public event typing, shared by the root and contract entries without producer globals. */
declare global {
  interface DocumentEventMap {
    /** Announced once the engine is live — load-order-proof discovery. */
    'arts-lightbox:ready': CustomEvent<ILightbox>
    'arts-lightbox:open': CustomEvent<ILightboxEventDetail>
    'arts-lightbox:change': CustomEvent<ILightboxChangeDetail>
    'arts-lightbox:destroy': CustomEvent<Pick<ILightboxEventDetail, 'root'>>
  }
}
