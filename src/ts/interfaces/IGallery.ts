import type { ISlideData } from './ISlideData'

/**
 * One lightbox gallery. Slides are deduped by canonical key; `elementsByKey`
 * remembers every DOM instance of a key — originals in DOM order, then clones
 * in DOM order — and the transition engine uses it to fly from/to the right
 * element.
 */
export interface IGallery {
  id: string
  slides: ISlideData[]
  elementsByKey: Map<string, HTMLElement[]>
}
