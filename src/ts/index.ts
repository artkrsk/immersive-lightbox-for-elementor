/// <reference path="./env.d.ts" />
/** Public boundary — the package's API is whatever this file re-exports.
 *  Themes compile src/ts from source, so the ambient declarations ride along
 *  (`createLightbox` reads the version define). */
export { createLightbox } from './core/createLightbox'
export type {
  IArtsLightboxGlobal,
  ILightbox,
  ILightboxChangeDetail,
  ILightboxEventDetail,
  IOptions
} from './interfaces'
export type { TDeepPartial } from './types'
