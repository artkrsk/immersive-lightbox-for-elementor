// @vitest-environment happy-dom

import { TRANSITIONING_CLASS } from '@ts/constants'
import { runOpenChoreography } from '@ts/transition/openChoreography'
import { playingSignal } from '@ts/video/playingSignal'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'
import { placedSlide, transitionContext } from '../helpers/transitionContext'

let frames: ReturnType<typeof installFrameClock>

beforeEach(() => {
  document.body.innerHTML = ''
  frames = installFrameClock()
})

/** Run the shared clock to completion. Duration defaults to 800ms. */
function settle(step = 200, times = 6): void {
  for (let i = 0; i < times; i++) {
    frames.step(step)
  }
}

describe('runOpenChoreography', () => {
  it('mounts the flight before hiding the source, and only after a handoff delay', () => {
    const { ctx, flight, hidden, sourceElement } = transitionContext()

    runOpenChoreography(ctx, vi.fn())

    expect(flight.mount).toHaveBeenCalledTimes(1)
    // The invariant CLAUDE.md spells out: the clicked element outlives the
    // flight's first frames, so the compositor has tiles before the hole opens.
    expect(hidden.hideAfterFrames).toHaveBeenCalledWith(sourceElement, 2)
    expect(flight.mount.mock.invocationCallOrder[0]).toBeLessThan(
      hidden.hideAfterFrames.mock.invocationCallOrder[0] as number
    )
  })

  it('paints the flight and the backdrop off one clock, then hands over', () => {
    const { ctx, flight, backdrop } = transitionContext()
    const onSettled = vi.fn()

    runOpenChoreography(ctx, onSettled)
    expect(onSettled).not.toHaveBeenCalled()

    frames.step(200)
    expect(backdrop.paint).toHaveBeenCalledTimes(1)
    expect(flight.paint).toHaveBeenCalledTimes(1)
    // Same frame count for both — one clock, not two tweens.
    expect(backdrop.paint.mock.calls.length).toBe(flight.paint.mock.calls.length)

    settle()
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(flight.leave).toHaveBeenCalledTimes(1)
  })

  it('ramps the chrome property and clears the transitioning class at the end', () => {
    const { ctx, root } = transitionContext()
    root.classList.add(TRANSITIONING_CLASS)

    runOpenChoreography(ctx, vi.fn())
    frames.step(200)
    expect(root.classList.contains(TRANSITIONING_CLASS)).toBe(true)
    // Chrome stays down through the first 65% of the clock by design.
    expect(root.style.getPropertyValue('--arts-lightbox-chrome')).toBe('0')

    settle()
    expect(root.classList.contains(TRANSITIONING_CLASS)).toBe(false)
    expect(root.style.getPropertyValue('--arts-lightbox-chrome')).toBe('1')
  })

  it('upgrades the flight to the full-size image once it decodes', async () => {
    const decode = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decode = decode
      }
    )
    const { ctx, flight } = transitionContext()

    runOpenChoreography(ctx, vi.fn())
    await vi.waitFor(() => {
      expect(flight.upgrade).toHaveBeenCalledWith('/full-a.jpg')
    })
  })

  it('never rejects the open when the full-size decode fails', async () => {
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        decode = vi.fn().mockRejectedValue(new Error('decode failed'))
      }
    )
    const { ctx, flight } = transitionContext()

    expect(() => {
      runOpenChoreography(ctx, vi.fn())
    }).not.toThrow()
    await Promise.resolve()
    expect(flight.upgrade).not.toHaveBeenCalled()
  })

  describe('with nothing to fly', () => {
    it('drops the transitioning class up front and fades the container instead', () => {
      const { ctx, root, container, flight } = transitionContext({ sourceSrc: false })
      root.classList.add(TRANSITIONING_CLASS)

      runOpenChoreography(ctx, vi.fn())

      // No cover means the class protects nothing — held to the end it just
      // made the content pop into place.
      expect(root.classList.contains(TRANSITIONING_CLASS)).toBe(false)
      expect(flight.mount).not.toHaveBeenCalled()
      expect(container.style.opacity).not.toBe('')
    })

    it('leaves nothing inline on the container once settled', () => {
      const { ctx, container } = transitionContext({ sourceSrc: false })

      runOpenChoreography(ctx, vi.fn())
      frames.step(200)
      expect(container.style.opacity).not.toBe('')

      settle()
      expect(container.style.opacity).toBe('')
      expect(container.style.translate).toBe('')
    })

    it('still settles when PhotoSwipe has placed no slide', () => {
      const { ctx, flight } = transitionContext({ slide: null })
      const onSettled = vi.fn()

      runOpenChoreography(ctx, onSettled)
      settle()

      expect(flight.mount).not.toHaveBeenCalled()
      expect(onSettled).toHaveBeenCalledTimes(1)
    })
  })

  describe('a video slide holds its cover', () => {
    const videoSlides = [
      { key: 'v', type: 'video' as const, src: 'https://youtu.be/x', width: 1600, height: 900 }
    ]

    it('waits for the player to report frames before dropping the flight', async () => {
      const el = document.createElement('div')
      let reportPlaying!: () => void
      playingSignal.set(
        el,
        new Promise<void>((resolve) => {
          reportPlaying = resolve
        })
      )
      const { ctx, flight } = transitionContext({
        slides: videoSlides,
        slide: placedSlide({ content: { element: el } })
      })

      runOpenChoreography(ctx, vi.fn())
      settle()

      // Clock is done, but the cover stays: a black loading iframe would
      // otherwise be what the fade reveals.
      expect(flight.leave).not.toHaveBeenCalled()

      reportPlaying()
      await vi.waitFor(() => {
        expect(flight.leave).toHaveBeenCalledTimes(1)
      })
    })

    it('gives up on a stalled player after the fallback lapses', async () => {
      // Only setTimeout: faking rAF/performance too would clobber the frame
      // clock this suite drives the choreography with.
      vi.useFakeTimers({ toFake: ['setTimeout'] })
      try {
        const { ctx, flight } = transitionContext({
          slides: videoSlides,
          slide: placedSlide({ content: { element: document.createElement('div') } })
        })

        runOpenChoreography(ctx, vi.fn())
        settle()
        expect(flight.leave).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1200)
        expect(flight.leave).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
