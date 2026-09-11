// @vitest-environment happy-dom

import { createExploreGlide } from '@ts/interaction/createExploreGlide'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'

function setup(over: { blocked?: boolean; aboveFit?: boolean } = {}) {
  const slide = {
    currZoomLevel: over.aboveFit === false ? 1 : 2,
    zoomLevels: { fit: 1 },
    bounds: { min: { x: 0, y: 0 }, max: { x: -400, y: -300 } },
    pan: { x: 0, y: 0 },
    panTo: vi.fn((x: number, y: number) => {
      slide.pan = { x, y }
    })
  }
  const pswp = { currSlide: slide, mainScroll: { itemHolders: [{ slide }] } }
  const isBlocked = vi.fn(() => over.blocked ?? false)
  const onTakeover = vi.fn()
  const glide = createExploreGlide(pswp as unknown as PhotoSwipe, { x: 1, y: 1 }, 0.5, {
    isBlocked,
    onTakeover
  })
  return { glide, isBlocked, onTakeover, pswp, slide }
}

describe('createExploreGlide', () => {
  it('takes over, smoothly follows the pointer, and schedules one frame at a time', () => {
    const frames = installFrameClock()
    const { glide, onTakeover, slide } = setup()

    glide.aim()
    glide.aim()
    expect(onTakeover).toHaveBeenCalledTimes(2)
    expect(frames.pending()).toBe(1)

    frames.step()
    expect(slide.panTo).toHaveBeenLastCalledWith(-200, -150)
    expect(frames.pending()).toBe(1)
  })

  it('does not take over while blocked or below fit', () => {
    const blocked = setup({ blocked: true })
    blocked.glide.aim()
    expect(blocked.onTakeover).not.toHaveBeenCalled()

    const belowFit = setup({ aboveFit: false })
    belowFit.glide.aim()
    expect(belowFit.onTakeover).not.toHaveBeenCalled()
  })

  it('drops a queued target when released or when the slide falls back to fit', () => {
    const frames = installFrameClock()
    const released = setup()
    released.glide.aim()
    released.glide.release()
    frames.step()
    expect(released.slide.panTo).not.toHaveBeenCalled()

    const belowFit = setup()
    belowFit.glide.aim()
    belowFit.slide.currZoomLevel = 1
    belowFit.glide.aim()
    frames.step()
    expect(belowFit.slide.panTo).not.toHaveBeenCalled()
  })

  it('cancels its outstanding frame on destroy', () => {
    installFrameClock()
    const cancel = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const { glide } = setup()

    glide.aim()
    glide.destroy()

    expect(cancel).toHaveBeenCalledWith(1)
  })
})
