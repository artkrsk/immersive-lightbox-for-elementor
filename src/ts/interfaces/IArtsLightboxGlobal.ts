import type { ILightbox } from './ILightbox'

/**
 * The discovery global (`window.artsLightbox`): exists from parse time with
 * a pending `ready`, so consumer code that loads first can await race-free.
 */
export interface IArtsLightboxGlobal {
  ready: Promise<ILightbox>
  get(): ILightbox | null
  version: string
  /**
   * Re-scan the page for candidate links and re-stamp the marker class —
   * call after replacing DOM (AJAX page transitions). No-op while disabled.
   */
  refresh(): void
}
