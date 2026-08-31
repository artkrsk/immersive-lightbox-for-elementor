import type { ICandidate, IGallery, IOptions } from '../interfaces'
import { findCandidates } from './findCandidates'

function galleryFor(
  galleries: IGallery[],
  byBucket: Map<unknown, IGallery>,
  bucket: unknown,
  id: string
): IGallery {
  let gallery = byBucket.get(bucket)
  if (!gallery) {
    gallery = { id, slides: [], elementsByKey: new Map() }
    byBucket.set(bucket, gallery)
    galleries.push(gallery)
  }
  return gallery
}

function addCandidate(gallery: IGallery, candidate: ICandidate): void {
  const { key } = candidate.data
  const instances = gallery.elementsByKey.get(key)
  if (instances) {
    instances.push(candidate.element)
    return
  }
  gallery.elementsByKey.set(key, [candidate.element])
  gallery.slides.push(candidate.data)
}

/**
 * Galleries from the DOM, in document order. Grouping: `uniteAll` puts every
 * candidate into one gallery; otherwise a shared group id forms a gallery and
 * ungrouped candidates bucket by their parent container (one widget's grid =
 * one gallery). Clones (same canonical key) collapse to one slide.
 *
 * Clones are added in a second pass so they never decide where a slide sits.
 * A looped Swiper puts its duplicates BEFORE the first real slide, and
 * first-occurrence-wins ordering would rotate the whole gallery by however
 * many it cloned. A clone whose original never turned up still becomes a
 * slide — appended, which beats dropping it.
 */
export function buildGalleries(
  root: ParentNode,
  opts: IOptions['gallery'],
  nativeFallback = false
): IGallery[] {
  const candidates = findCandidates(root, nativeFallback)
  const galleries: IGallery[] = []
  const byBucket = new Map<unknown, IGallery>()
  const clones: Array<[IGallery, ICandidate]> = []
  let generated = 0

  for (const candidate of candidates) {
    let gallery: IGallery
    if (opts.uniteAll) {
      gallery = galleryFor(galleries, byBucket, 'united', 'united')
    } else if (candidate.groupId !== null) {
      gallery = galleryFor(galleries, byBucket, `group:${candidate.groupId}`, candidate.groupId)
    } else {
      const bucket = candidate.element.parentElement ?? candidate.element
      gallery = galleryFor(galleries, byBucket, bucket, `gallery-${++generated}`)
    }
    if (candidate.isClone) {
      clones.push([gallery, candidate])
      continue
    }
    addCandidate(gallery, candidate)
  }
  for (const [gallery, candidate] of clones) {
    addCandidate(gallery, candidate)
  }
  return galleries
}
