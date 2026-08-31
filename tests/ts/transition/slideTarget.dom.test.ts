// @vitest-environment happy-dom

import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { computeSlideRect } from '@ts/transition/computeSlideRect'
import { currentSlideTarget } from '@ts/transition/slideTarget'
import { describe, expect, it } from 'vitest'

function slide(width: number, height: number) {
  return { pan: { x: 10, y: 20 }, currZoomLevel: 2, width, height }
}

describe('currentSlideTarget', () => {
  it('returns null without a current slide', () => {
    const pswp = { currSlide: undefined, element: undefined } as unknown as PhotoSwipe
    expect(currentSlideTarget(pswp)).toBeNull()
  })

  it('returns null when width or height is falsy', () => {
    const pswp = { currSlide: slide(0, 100), element: undefined } as unknown as PhotoSwipe
    expect(currentSlideTarget(pswp)).toBeNull()
  })

  it('combines the slide rect with the parsed radius custom property', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    element.style.setProperty('--arts-lightbox-slide-radius', '12')
    const currSlide = slide(100, 50)
    const pswp = { currSlide, element } as unknown as PhotoSwipe

    expect(currentSlideTarget(pswp)).toEqual({
      rect: computeSlideRect(currSlide),
      radius: 12
    })
  })

  it('defaults radius to 0 without a pswp element', () => {
    const currSlide = slide(100, 50)
    const pswp = { currSlide, element: undefined } as unknown as PhotoSwipe

    expect(currentSlideTarget(pswp)).toEqual({
      rect: computeSlideRect(currSlide),
      radius: 0
    })
  })

  it('defaults radius to 0 when the custom property is absent', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const currSlide = slide(100, 50)
    const pswp = { currSlide, element } as unknown as PhotoSwipe

    expect(currentSlideTarget(pswp)?.radius).toBe(0)
  })
})
