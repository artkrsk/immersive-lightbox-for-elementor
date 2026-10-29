// @vitest-environment happy-dom

import { TRANSITIONING_CLASS } from '@ts/constants'
import { decodedImages } from '@ts/transition/decodedImages'
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
  it('keeps the source on the page for the whole open and hides it only at settle', () => {
    const { ctx, flight, hidden, sourceElement } = transitionContext({ sourceSrc: '/full-a.jpg' })

    runOpenChoreography(ctx, vi.fn())

    expect(flight.mount).toHaveBeenCalledTimes(1)
    // The invariant CLAUDE.md spells out: the flight covers the original for
    // every frame of the open, so a clone that has not painted yet shows the
    // original through it — never the page background.
    frames.step(200)
    expect(hidden.hide).not.toHaveBeenCalled()

    settle()
    expect(hidden.hide).toHaveBeenCalledWith(sourceElement)
    expect(flight.mount.mock.invocationCallOrder[0]).toBeLessThan(
      hidden.hide.mock.invocationCallOrder[0] as number
    )
  })

  it('leaves the source alone when a navigation mid-open moved on', () => {
    const { ctx, hidden, pswp } = transitionContext({ sourceSrc: '/full-a.jpg' })

    runOpenChoreography(ctx, vi.fn())
    pswp.currIndex = 1
    settle()

    expect(hidden.hide).not.toHaveBeenCalled()
  })

  it('flies once on the compositor, paints the backdrop on the clock, then hands over', () => {
    const { ctx, flight, backdrop } = transitionContext({ sourceSrc: '/full-a.jpg' })
    const onSettled = vi.fn()

    runOpenChoreography(ctx, onSettled)
    expect(onSettled).not.toHaveBeenCalled()
    // The box is the landing rect; the flight is one animation, same duration
    // and curve as the clock the backdrop reads.
    expect(flight.mount).toHaveBeenCalledWith({ w: 800, h: 600 }, { src: '/full-a.jpg' }, [])
    expect(flight.fly).toHaveBeenCalledTimes(1)
    expect(flight.fly).toHaveBeenCalledWith(expect.any(Function), 800, 'power2.inOut')

    frames.step(200)
    expect(backdrop.paint).toHaveBeenCalledTimes(1)
    // The slide has not moved: nothing to re-aim at.
    expect(flight.retarget).not.toHaveBeenCalled()

    settle()
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(flight.leave).toHaveBeenCalledTimes(1)
  })

  it('re-aims the flight when explore pans the slide mid-flight', () => {
    const slide = placedSlide()
    const { ctx, flight } = transitionContext({ sourceSrc: '/full-a.jpg', slide })

    runOpenChoreography(ctx, vi.fn())
    frames.step(200)
    expect(flight.retarget).not.toHaveBeenCalled()

    slide.pan = { x: 80, y: 30 }
    frames.step(200)
    expect(flight.retarget).toHaveBeenCalledTimes(1)
    const frameAt = flight.retarget.mock.calls[0]?.[0] as (p: number) => { x: number }
    // The re-aimed curve lands on the panned rect.
    expect(frameAt(1).x).toBe(80)

    // Still there next frame: no churn while the pointer rests.
    frames.step(200)
    expect(flight.retarget).toHaveBeenCalledTimes(1)
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

  describe('the file the flight carries', () => {
    /** A fake Image whose decode the test settles by hand. */
    function stubImageDecode(): { resolve(): void; reject(): void } {
      let resolve!: () => void
      let reject!: () => void
      const decode = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
      vi.stubGlobal(
        'Image',
        class {
          src = ''
          decode = (): Promise<void> => decode
        }
      )
      return { resolve, reject }
    }

    it('flies the full-size file from the first frame when the warm-up decoded it', async () => {
      stubImageDecode().resolve()
      await decodedImages.warm('/full-warm.jpg')
      const { ctx, flight } = transitionContext({
        slides: [{ key: 'w', type: 'image', src: '/full-warm.jpg', width: 1600, height: 1200 }]
      })

      runOpenChoreography(ctx, vi.fn())

      expect(flight.mount).toHaveBeenCalledWith(expect.anything(), { src: '/full-warm.jpg' }, [])
      settle()
      // Nothing to wait for: the hand-off is immediate.
      expect(flight.leave).toHaveBeenCalledTimes(1)
    })

    it('flies the page candidate when the full-size file is cold, never swapping mid-flight', async () => {
      const decode = stubImageDecode()
      const { ctx, flight } = transitionContext({
        slides: [{ key: 'c', type: 'image', src: '/full-cold.jpg', width: 1600, height: 1200 }]
      })

      runOpenChoreography(ctx, vi.fn())
      expect(flight.mount).toHaveBeenCalledWith(expect.anything(), { src: '/thumb-a.jpg' }, [])

      settle()
      // Landed, but the hand-off waits for the sharp slide to be decodable.
      expect(flight.leave).not.toHaveBeenCalled()

      decode.resolve()
      await vi.waitFor(() => {
        expect(flight.leave).toHaveBeenCalledTimes(1)
      })
    })

    it('still hands over when the full-size decode fails', async () => {
      const decode = stubImageDecode()
      const { ctx, flight } = transitionContext({
        slides: [{ key: 'f', type: 'image', src: '/full-failed.jpg', width: 1600, height: 1200 }]
      })

      expect(() => {
        runOpenChoreography(ctx, vi.fn())
      }).not.toThrow()
      settle()
      decode.reject()

      await vi.waitFor(() => {
        expect(flight.leave).toHaveBeenCalledTimes(1)
      })
    })

    it('gives up on a stalled decode after the fallback lapses', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] })
      try {
        stubImageDecode()
        const { ctx, flight } = transitionContext({
          slides: [{ key: 's', type: 'image', src: '/full-stalled.jpg', width: 1600, height: 1200 }]
        })

        runOpenChoreography(ctx, vi.fn())
        settle()
        expect(flight.leave).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1000)
        expect(flight.leave).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })
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
