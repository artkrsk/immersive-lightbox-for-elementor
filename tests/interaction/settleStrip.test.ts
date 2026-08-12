import { settleStrip } from '@ts/interaction/settleStrip'
import type PhotoSwipe from '@ts/photoswipe/photoswipe.js'
import { describe, expect, it, vi } from 'vitest'

function strip(shiftPx: number) {
  const moveIndexBy = vi.fn()
  const pswp = {
    viewportSize: { x: 1000 },
    mainScroll: {
      x: 5000 + shiftPx,
      getCurrSlideX: () => 5000,
      isShifted: () => shiftPx !== 0,
      moveIndexBy
    }
  }
  return { pswp: pswp as unknown as PhotoSwipe, moveIndexBy }
}

describe('settleStrip', () => {
  it('returns false when the strip is not shifted', () => {
    const { pswp, moveIndexBy } = strip(0)
    expect(settleStrip(pswp, -1)).toBe(false)
    expect(moveIndexBy).not.toHaveBeenCalled()
  })

  it('a fast release toward the neighbor commits it', () => {
    const { pswp, moveIndexBy } = strip(-120) // slightly toward next
    expect(settleStrip(pswp, -0.8)).toBe(true)
    expect(moveIndexBy).toHaveBeenCalledWith(1, true, -0.8)
  })

  it('a slow release past half a viewport commits too', () => {
    const { pswp, moveIndexBy } = strip(-600) // past halfway
    settleStrip(pswp, 0.05)
    expect(moveIndexBy).toHaveBeenCalledWith(1, true, 0)
  })

  it('a small shift with no speed snaps back', () => {
    const { pswp, moveIndexBy } = strip(-120)
    settleStrip(pswp, 0)
    expect(moveIndexBy).toHaveBeenCalledWith(0, true, 0)
  })

  it('mirrors for the previous direction', () => {
    const { pswp, moveIndexBy } = strip(700)
    settleStrip(pswp, 0.02)
    expect(moveIndexBy).toHaveBeenCalledWith(-1, true, 0.02)
  })
})
