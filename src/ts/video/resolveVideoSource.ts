import type { ISlideData } from '../interfaces'
import { adoptVideo } from './adoptVideo'
import { findAdoptableVideo } from './findAdoptableVideo'

/**
 * Resolve the opened slide's video source tier at click time: adopt the
 * live background video when it's genuinely visible; remember hidden ones
 * (WebGL texture sources) for clone-and-seek. Cold players need nothing
 * resolved here.
 */
export function resolveVideoSource(
  slide: ISlideData | undefined,
  sourceElement: HTMLElement
): void {
  if (slide?.type !== 'video' || !slide.sourceVideo) {
    return
  }
  const adoptable = findAdoptableVideo(sourceElement)
  if (adoptable) {
    slide.adopted = adoptVideo(adoptable)
    return
  }
  const hidden = sourceElement.querySelector('video')
  if (hidden) {
    slide.cloneSource = hidden
  }
}
