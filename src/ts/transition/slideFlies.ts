import type { ISlideData } from '../interfaces'

/**
 * Whether a slide's trigger is worth morphing into the slide.
 *
 * The flight only reads as one object moving when both ends are the same
 * shape. For an image they always are — the slide's box comes from the image
 * being flown. For a VIDEO slide they usually are not: extraction refuses the
 * trigger `<img>` for dims (a photo a link happens to hang on says nothing
 * about the player), so the box is either a wrapped `<video>`'s own size or
 * the 16:9 default. Morph a portrait photo into that and the shape changes
 * mid-flight, then hands over to a player letterboxing itself inside it.
 *
 * So a video slide flies exactly when the flight paints the same element the
 * box came from: a wrapped `<video>`, whose poster is a real frame of it at
 * its own aspect. That covers every provider at once — an embed has no
 * `<video>` to wrap, and neither does a bare `.mp4` link on a photograph.
 *
 * This narrows the existing rules rather than replacing them — a slide with no
 * visual at either end is already caught by the empty flight source.
 */
export function slideFlies(slide: ISlideData | undefined, sourceEl: HTMLElement | null): boolean {
  if (slide?.type !== 'video') {
    return true
  }
  // The same lookup extraction uses for dims and the capture uses for pixels.
  return Boolean(sourceEl?.querySelector('video'))
}
