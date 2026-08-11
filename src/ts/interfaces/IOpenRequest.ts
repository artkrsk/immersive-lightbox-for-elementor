import type { IGallery } from './IGallery'

/** A resolved click: which gallery, which slide, which DOM element it came from. */
export interface IOpenRequest {
  gallery: IGallery
  index: number
  sourceElement: HTMLElement
}
