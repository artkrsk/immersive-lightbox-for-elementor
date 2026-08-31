import type { ISlideData } from '../interfaces'

/** PhotoSwipe content carries our slide model in `data`. */
export function slideData(content: { data: unknown }): ISlideData {
  return content.data as ISlideData
}
