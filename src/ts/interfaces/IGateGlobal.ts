import type { IArtsLightboxGlobal } from './IArtsLightboxGlobal'
import type { ILightbox } from './ILightbox'

/** The gate's pre-engine shape of the global; boot.ts claims the resolver. */
export interface IGateGlobal extends IArtsLightboxGlobal {
  __resolveReady: (lightbox: ILightbox) => void
}
