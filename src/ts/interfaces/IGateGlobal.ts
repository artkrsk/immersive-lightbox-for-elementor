import type { IArtsLightboxGlobal } from './IArtsLightboxGlobal'
import type { ILightbox } from './ILightbox'
import type { ILightboxRootPublisher } from './ILightboxRootPublisher'

/** The window-owned hub shared by the separately bundled gate and engine. */
export interface IGateGlobal extends IArtsLightboxGlobal {
  __setInstance(lightbox: ILightbox | null): void
  __roots: ILightboxRootPublisher
  __disposeBoot?: () => void
  __replaceBoot(install: () => void): void
}
