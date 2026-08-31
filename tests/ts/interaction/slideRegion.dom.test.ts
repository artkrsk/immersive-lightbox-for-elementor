// @vitest-environment happy-dom

import { attachSlideRegion } from '@ts/interaction/slideRegion'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const OVER_IMAGE = 'arts-lightbox-over-image'

function setup() {
  const pswp = fakePswp()
  const root = document.createElement('div')
  root.className = 'pswp'
  root.innerHTML =
    '<div class="pswp__container"><div class="pswp__item"><img class="pswp__img" alt=""></div></div>'
  document.body.appendChild(root)
  pswp.element = root
  attachSlideRegion(pswp as unknown as PhotoSwipe)
  pswp.emit('afterInit', {})
  return {
    pswp,
    root,
    img: root.querySelector('.pswp__img') as HTMLElement,
    item: root.querySelector('.pswp__item') as HTMLElement
  }
}

const over = (el: HTMLElement) => {
  el.dispatchEvent(new Event('pointerover', { bubbles: true }))
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.className = ''
})

afterEach(() => {
  document.documentElement.className = ''
})

describe('attachSlideRegion', () => {
  it('marks when the pointer is over the image itself', () => {
    // The glyph is drawn in another element entirely, so the region has to
    // reach it as state — this is what lets one pair of bars be a plus, a
    // minus or a cross without the markup being swapped underneath.
    const { img } = setup()
    expect(document.documentElement.className).not.toContain(OVER_IMAGE)

    over(img)
    expect(document.documentElement.className).toContain(OVER_IMAGE)
  })

  it('drops the mark over the space beside the image', () => {
    // Where a click closes rather than zooms.
    const { img, item } = setup()
    over(img)
    over(item)
    expect(document.documentElement.className).not.toContain(OVER_IMAGE)
  })

  it('clears the mark with the lightbox', () => {
    const { pswp, img } = setup()
    over(img)
    pswp.emit('destroy', {})
    expect(document.documentElement.className).not.toContain(OVER_IMAGE)
  })
})
