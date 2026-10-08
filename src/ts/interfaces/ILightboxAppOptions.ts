import type { TDeepPartial } from '../types/TDeepPartial'
import type { IOptions } from './IOptions'

export interface ILightboxAppOptions {
  options?: TDeepPartial<IOptions> | undefined
  /** Original gate lifetime, captured before importing the engine. */
  signal?: AbortSignal | undefined
}
