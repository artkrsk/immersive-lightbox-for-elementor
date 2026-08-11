import type { IArtsLightboxGlobal } from './interfaces/IArtsLightboxGlobal'
import type { ILightbox } from './interfaces/ILightbox'
import type { IOptions } from './interfaces/IOptions'
import type { TDeepPartial } from './types/TDeepPartial'
import type { TGateBoot } from './types/TGateBoot'

/**
 * Consumer-facing discovery contract. Ambient names deliberately keep their
 * built-in casing — prefixing would break TS declaration merging.
 */
declare global {
  interface Window {
    artsLightbox?: IArtsLightboxGlobal
    /** Read once by boot.ts. Absent outside WordPress. */
    artsBetterLightboxOptions?: TDeepPartial<IOptions>
    /** Read by gate.ts at parse and load time. Absent outside WordPress. */
    artsBetterLightboxBoot?: TGateBoot
  }

  interface DocumentEventMap {
    /** Announced once the engine is live — load-order-proof discovery. */
    'arts-lightbox:ready': CustomEvent<ILightbox>
  }
}
