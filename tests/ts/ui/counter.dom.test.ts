// @vitest-environment happy-dom

import type { IGallery, ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { registerCounter } from '@ts/ui/counter'
import { describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function fakeGallery(count: number): IGallery {
  const slides: ISlideData[] = Array.from({ length: count }, (_, i) => ({
    key: `k${i}`,
    type: 'image',
    src: ''
  }))
  return { id: 'g', slides, elementsByKey: new Map() }
}

describe('registerCounter', () => {
  it('renders the padded index over total on registration', () => {
    const pswp = fakePswp()
    registerCounter(pswp as unknown as PhotoSwipe, fakeGallery(6))
    expect(pswp.uiElementAt(0).textContent).toBe('01 / 06')
  })

  it('updates at commit, before the strip lands', () => {
    const pswp = fakePswp()
    registerCounter(pswp as unknown as PhotoSwipe, fakeGallery(12))
    pswp.potentialIndex = 4
    pswp.emit('potentialIndexChange', { direction: 1 })
    expect(pswp.currIndex).toBe(0)
    expect(pswp.uiElementAt(0).textContent).toBe('05 / 12')
  })

  it('syncs on the init-time change — the index is assigned after the UI is built', () => {
    const pswp = fakePswp()
    registerCounter(pswp as unknown as PhotoSwipe, fakeGallery(12))
    pswp.currIndex = 7
    pswp.potentialIndex = 7
    pswp.emit('change', {})
    expect(pswp.uiElementAt(0).textContent).toBe('08 / 12')
  })
})
