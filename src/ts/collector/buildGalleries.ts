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
 */
export function buildGalleries(root: ParentNode, opts: IOptions['gallery']): IGallery[] {
  const candidates = findCandidates(root)
  const galleries: IGallery[] = []
  const byBucket = new Map<unknown, IGallery>()
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
    addCandidate(gallery, candidate)
  }
  return galleries
}

/** The next/previous gallery in DOM order — pass-through navigation support. */
export function neighborGallery(
  current: IGallery,
  galleries: IGallery[],
  dir: 1 | -1
): IGallery | null {
  const index = galleries.indexOf(current)
  if (index === -1) {
    return null
  }
  return galleries[index + dir] ?? null
}
