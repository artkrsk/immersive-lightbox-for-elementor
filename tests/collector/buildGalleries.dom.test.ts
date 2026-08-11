// @vitest-environment happy-dom

import { buildGalleries, neighborGallery } from '@ts/collector/buildGalleries'
import { resolveOpenRequest } from '@ts/collector/resolveOpenRequest'
import { DEFAULT_OPTIONS } from '@ts/constants'
import { describe, expect, it } from 'vitest'

const galleryOpts = (patch: Partial<typeof DEFAULT_OPTIONS.gallery> = {}) => ({
  ...DEFAULT_OPTIONS.gallery,
  ...patch
})

function item(href: string, extra = ''): string {
  return `<a href="${href}" data-arts-lightbox ${extra}><img src="${href}-t.jpg" alt="" /></a>`
}

describe('buildGalleries', () => {
  it('builds one gallery per group id, DOM order preserved', () => {
    document.body.innerHTML = `
      <div data-arts-lightbox-group="a">${item('/a1.jpg')}${item('/a2.jpg')}</div>
      <div data-arts-lightbox-group="b">${item('/b1.jpg')}${item('/b2.jpg')}${item('/b3.jpg')}</div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    expect(galleries.length).toBe(2)
    expect(galleries[0]?.slides.length).toBe(2)
    expect(galleries[1]?.slides.length).toBe(3)
    expect(galleries[0]?.slides[0]?.src).toContain('/a1.jpg')
  })

  it('splits ungrouped candidates by their parent container', () => {
    document.body.innerHTML = `
      <div class="widget-one">${item('/w1a.jpg')}${item('/w1b.jpg')}</div>
      <div class="widget-two">${item('/w2a.jpg')}</div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    expect(galleries.length).toBe(2)
    expect(galleries[0]?.slides.length).toBe(2)
    expect(galleries[1]?.slides.length).toBe(1)
  })

  it('unites everything into one gallery in DOM order when uniteAll is on', () => {
    document.body.innerHTML = `
      <div data-arts-lightbox-group="a">${item('/a1.jpg')}${item('/a2.jpg')}</div>
      <div>${item('/u1.jpg')}</div>
      <div data-arts-lightbox-group="b">${item('/b1.jpg')}${item('/b2.jpg')}</div>
    `
    const galleries = buildGalleries(document, galleryOpts({ uniteAll: true }))
    expect(galleries.length).toBe(1)
    expect(galleries[0]?.slides.map((s) => s.src)).toEqual([
      '/a1.jpg',
      '/a2.jpg',
      '/u1.jpg',
      '/b1.jpg',
      '/b2.jpg'
    ])
  })

  it('collapses clones to one slide but remembers every DOM instance', () => {
    document.body.innerHTML = `
      <div class="list">
        ${item('/same.jpg')}${item('/other.jpg')}${item('/same.jpg')}${item('/same.jpg')}
      </div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    const gallery = galleries[0]
    expect(gallery?.slides.length).toBe(2)
    const key = gallery?.slides[0]?.key ?? ''
    expect(gallery?.elementsByKey.get(key)?.length).toBe(3)
  })

  it('dedupes by explicit data-id even across different URLs', () => {
    document.body.innerHTML = `
      <div class="list">
        ${item('/one.jpg', 'data-arts-lightbox-id="same-slide"')}
        ${item('/two.jpg', 'data-arts-lightbox-id="same-slide"')}
      </div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    expect(galleries[0]?.slides.length).toBe(1)
    expect(galleries[0]?.elementsByKey.get('same-slide')?.length).toBe(2)
  })
})

describe('resolveOpenRequest', () => {
  it('resolves a clicked clone to the canonical slide with the clone as source', () => {
    document.body.innerHTML = `
      <div class="list">
        ${item('/same.jpg')}${item('/other.jpg')}${item('/same.jpg')}
      </div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    const anchors = [...document.querySelectorAll<HTMLElement>('a')]
    const secondClone = anchors[2]
    if (!secondClone) {
      throw new Error('fixture broken')
    }
    const req = resolveOpenRequest(secondClone, galleries)
    expect(req?.index).toBe(0)
    expect(req?.sourceElement).toBe(secondClone)
    expect(req?.gallery).toBe(galleries[0])
  })

  it('returns null for elements outside any gallery', () => {
    document.body.innerHTML = `<div class="list">${item('/a.jpg')}</div>`
    const galleries = buildGalleries(document, galleryOpts())
    const stranger = document.createElement('a')
    expect(resolveOpenRequest(stranger, galleries)).toBeNull()
  })
})

describe('neighborGallery', () => {
  it('walks galleries in DOM order and returns null at the ends', () => {
    document.body.innerHTML = `
      <div data-arts-lightbox-group="a">${item('/a1.jpg')}</div>
      <div data-arts-lightbox-group="b">${item('/b1.jpg')}</div>
    `
    const galleries = buildGalleries(document, galleryOpts())
    const [first, second] = galleries
    if (!first || !second) {
      throw new Error('fixture broken')
    }
    expect(neighborGallery(first, galleries, 1)).toBe(second)
    expect(neighborGallery(second, galleries, 1)).toBeNull()
    expect(neighborGallery(second, galleries, -1)).toBe(first)
    expect(neighborGallery(first, galleries, -1)).toBeNull()
  })
})
