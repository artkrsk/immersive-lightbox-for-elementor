import type { ILightboxRoot } from './ILightboxRoot'

/** Internal publication seam; standalone library instances need no global. */
export interface ILightboxRootPublisher {
  set(value: ILightboxRoot): void
  delete(root: HTMLElement): void
}
