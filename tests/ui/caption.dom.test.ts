// @vitest-environment happy-dom

import type { IGallery, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerCaption } from '@ts/ui/caption'
import { describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const SHIFT = '--arts-lightbox-caption-shift'
const FADE = '--arts-lightbox-caption-fade'

function fakeGallery(captions: (string | undefined)[]): IGallery {
  // exactOptionalPropertyTypes: an absent caption means an absent key.
  const slides: ISlideData[] = captions.map((caption, i) => {
    const slide: ISlideData = { key: `k${i}`, type: 'image', src: '' }
    if (caption !== undefined) {
      slide.caption = caption
    }
    return slide
  })
  return { id: 'g', slides, elementsByKey: new Map() }
}

function items(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.arts-lightbox-caption__item')]
}

const shift = (node: HTMLElement): number => Number(node.style.getPropertyValue(SHIFT))
const fade = (node: HTMLElement): number => Number(node.style.getPropertyValue(FADE))

describe('registerCaption', () => {
  it('renders one element per captioned slide and skips the rest', () => {
    const pswp = fakePswp()
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery(['One', undefined, 'Three']))
    const rendered = items(pswp.uiElementAt(0))

    expect(rendered).toHaveLength(2)
    expect(rendered.map((n) => n.textContent)).toEqual(['One', 'Three'])
  })

  it('shows the slide at rest and parks its neighbour out of view', () => {
    const pswp = fakePswp()
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery(['One', 'Two']))
    const [first, second] = items(pswp.uiElementAt(0)) as [HTMLElement, HTMLElement]

    expect(fade(first)).toBe(1)
    expect(shift(first)).toBe(0)
    expect(fade(second)).toBe(0)
    expect(shift(second)).not.toBe(0)
  })

  it('projects a mid-transition position rather than waiting for the commit', () => {
    const pswp = fakePswp()
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery(['One', 'Two']))
    const [first, second] = items(pswp.uiElementAt(0)) as [HTMLElement, HTMLElement]

    // Half a slide forward: x still trails the already-moved target by half.
    pswp.potentialIndex = 1
    pswp.mainScroll.currSlideX = -1000
    pswp.mainScroll.x = -500
    pswp.emit('moveMainScroll', { x: -500, dragging: true })

    // Both partially present at once — a handoff, not a sequence.
    expect(fade(first)).toBeGreaterThan(0)
    expect(fade(first)).toBeLessThan(1)
    expect(fade(second)).toBeGreaterThan(0)
    expect(fade(second)).toBeLessThan(1)
  })

  it('sends neighbours to opposite sides, so direction needs no flag', () => {
    const pswp = fakePswp()
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery(['One', 'Two', 'Three']))
    const rendered = items(pswp.uiElementAt(0)) as [HTMLElement, HTMLElement, HTMLElement]

    // Sitting on slide 1: slide 0 is behind it, slide 2 is ahead of it.
    pswp.potentialIndex = 1
    pswp.emit('change', {})

    expect(Math.sign(shift(rendered[0]))).toBe(-Math.sign(shift(rendered[2])))
  })

  it('leaves the caption alone when the scroller has no width yet', () => {
    const pswp = fakePswp()
    pswp.mainScroll.slideWidth = 0
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery(['One']))
    const [only] = items(pswp.uiElementAt(0)) as [HTMLElement]

    // No division by zero, nothing written.
    expect(only.style.getPropertyValue(SHIFT)).toBe('')
  })

  it('registers nothing to paint when no slide has a caption', () => {
    const pswp = fakePswp()
    registerCaption(pswp as unknown as PhotoSwipe, fakeGallery([undefined, undefined]))

    expect(items(pswp.uiElementAt(0))).toHaveLength(0)
  })
})
