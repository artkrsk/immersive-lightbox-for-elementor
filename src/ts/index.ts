/// <reference path="./contract/events.d.ts" />
/// <reference path="./env.d.ts" />
/** Passive library entry; the app publishes discovery only when initialized. */
export { createLightbox } from './core/createLightbox'
export { createLightboxApp } from './core/createLightboxApp'
export type {
  IArtsLightboxGlobal,
  ILightbox,
  ILightboxChangeDetail,
  ILightboxEventDetail,
  ILightboxObserveOptions,
  ILightboxRoot,
  IOptions
} from './interfaces'
export type { ILightboxApp } from './interfaces/ILightboxApp'
export type { ILightboxAppOptions } from './interfaces/ILightboxAppOptions'
export type { TDeepPartial, TLightboxRootsObserver } from './types'
