// @vitest-environment happy-dom

import type { IGallery, IOpenRequest } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe.js'
import { findCloseSource } from '@ts/transition/findCloseSource'
import { beforeEach, describe, expect, it } from 'vitest'

function mockRect(el: HTMLElement, rect: { top: number; height: number; width: number }): void {
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      bottom: rect.top + rect.height,
      left: 0,
      right: rect.width,
      width: rect.width,
      height: rect.height,
      x: 0,
      y: rect.top
    }) as DOMRect
}

function scene(): { req: IOpenRequest; original: HTMLElement; clone: HTMLElement } {
  document.body.innerHTML = '<a id="o" href="/a.jpg"></a><a id="c" href="/a.jpg"></a>'
  const original = document.querySelector('#o') as HTMLElement
  const clone = document.querySelector('#c') as HTMLElement
  const gallery: IGallery = {
    id: 'g',
    slides: [{ key: 'a', type: 'image', src: '/a.jpg' }],
    elementsByKey: new Map([['a', [original, clone]]])
  }
  return { req: { gallery, index: 0, sourceElement: original }, original, clone }
}

const pswp = { currIndex: 0 } as unknown as PhotoSwipe

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('findCloseSource', () => {
  it('prefers the element the user opened from while it is on screen', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: 100, height: 200, width: 300 })
    mockRect(clone, { top: 400, height: 200, width: 300 })
    expect(findCloseSource(pswp, req)).toBe(original)
  })

  it('falls back to the first on-screen clone when the original scrolled away', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: -900, height: 200, width: 300 }) // above the viewport
    mockRect(clone, { top: 400, height: 200, width: 300 })
    expect(findCloseSource(pswp, req)).toBe(clone)
  })

  it('returns null when no instance is visible', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: -900, height: 200, width: 300 })
    mockRect(clone, { top: 0, height: 0, width: 0 }) // zero-size = not rendered
    expect(findCloseSource(pswp, req)).toBeNull()
  })
})
