// @vitest-environment happy-dom

import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { onSlidePosition } from '@ts/ui/slidePosition'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

describe('onSlidePosition', () => {
  it('reports the resting index when nothing is moving', () => {
    const pswp = fakePswp()
    const seen: number[] = []
    pswp.potentialIndex = 2
    onSlidePosition(pswp as unknown as PhotoSwipe, (p) => seen.push(p))

    expect(seen).toEqual([2])
  })

  it('reports a fraction while the scroller is between slides', () => {
    const pswp = fakePswp()
    const seen: number[] = []
    onSlidePosition(pswp as unknown as PhotoSwipe, (p) => seen.push(p))

    // Nav to slide 1 has already moved the target; x still trails by 40%.
    pswp.potentialIndex = 1
    pswp.mainScroll.currSlideX = -1000
    pswp.mainScroll.x = -600
    pswp.emit('moveMainScroll', { x: -600, dragging: false })

    expect(seen.at(-1)).toBeCloseTo(0.6, 5)
  })

  it('stays continuous across a drag release, which re-bases both anchors', () => {
    const pswp = fakePswp()
    const seen: number[] = []
    onSlidePosition(pswp as unknown as PhotoSwipe, (p) => seen.push(p))

    // Mid-drag: the index has not moved, only x.
    pswp.mainScroll.x = -400
    pswp.emit('moveMainScroll', { x: -400, dragging: true })
    const duringDrag = seen.at(-1)

    // Release: moveIndexBy advances potentialIndex AND the slide origin at
    // once, so the same physical position must read the same.
    pswp.potentialIndex = 1
    pswp.mainScroll.currSlideX = -1000
    pswp.emit('moveMainScroll', { x: -400, dragging: false })

    expect(duringDrag).toBeCloseTo(0.4, 5)
    expect(seen.at(-1)).toBeCloseTo(0.4, 5)
  })

  it('says nothing until the scroller has been sized', () => {
    const pswp = fakePswp()
    pswp.mainScroll.slideWidth = 0
    const paint = vi.fn()
    onSlidePosition(pswp as unknown as PhotoSwipe, paint)
    pswp.emit('moveMainScroll', { x: 0, dragging: false })

    // Division guard — uiRegister runs before updateSize on a fresh core.
    expect(paint).not.toHaveBeenCalled()
  })

  it('also reports on change, for an index move that carries no motion', () => {
    const pswp = fakePswp()
    const paint = vi.fn()
    onSlidePosition(pswp as unknown as PhotoSwipe, paint)
    paint.mockClear()

    pswp.potentialIndex = 3
    pswp.emit('change', {})

    expect(paint).toHaveBeenCalledWith(3)
  })
})
