import type { ISlideData } from './ISlideData'

/** A lightbox-openable element found in the DOM, with its extracted data. */
export interface ICandidate {
  element: HTMLElement
  data: ISlideData
  groupId: string | null
}
