// @vitest-environment happy-dom

import { CLOSING_CLASS, TRANSITIONING_CLASS } from '@ts/constants'
import { runCloseChoreography } from '@ts/transition/closeChoreography'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'
import { giveRect, transitionContext } from '../helpers/transitionContext'

let frames: ReturnType<typeof installFrameClock>

beforeEach(() => {
  document.body.innerHTML = ''
  frames = installFrameClock()
})

/**
 * Drive the clock past completion, then one more frame — the close resolves
 * an rAF AFTER onDone, so a test that stops at completion hangs.
 */
function settle(step = 200, times = 7): void {
  for (let i = 0; i < times; i++) {
    frames.step(step)
  }
}

/**
 * A source the close can actually fly to: a real img for the pixels, plus a
 * rect on both, since the visibility gate is pure geometry.
 */
function flyableSource(el: HTMLElement): void {
  const img = document.createElement('img')
  img.src = '/thumb-a.jpg'
  el.appendChild(img)
  giveRect(el)
  giveRect(img)
}

describe('runCloseChoreography', () => {
  it('marks the root as closing so nothing answers the pointer on the way out', () => {
    const { ctx, root } = transitionContext()

    void runCloseChoreography(ctx)

    expect(root.classList.contains(CLOSING_CLASS)).toBe(true)
  })

  it('runs the backdrop in reverse and tears it down at the end', async () => {
    const { ctx, backdrop } = transitionContext()

    const done = runCloseChoreography(ctx)
    expect(backdrop.beginClose).toHaveBeenCalledTimes(1)

    frames.step(200)
    expect(backdrop.paint).toHaveBeenCalledTimes(1)
    // Closing flag threaded through so the curtain knows which way to exit.
    expect(backdrop.paint.mock.calls[0]?.[1]).toBe(true)

    settle()
    await done
    expect(backdrop.destroy).toHaveBeenCalledTimes(1)
    expect(ctx.backdrop.current).toBeNull()
  })

  it('detaches the flight before destroying the root it lives inside', async () => {
    const { ctx, flight, destroy, sourceElement } = transitionContext()
    flyableSource(sourceElement)

    const done = runCloseChoreography(ctx)
    settle()
    await done

    expect(flight.detach).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledTimes(1)
    // The flight has to outlive the teardown — order is the whole point.
    expect(flight.detach.mock.invocationCallOrder[0]).toBeLessThan(
      destroy.mock.invocationCallOrder[0] as number
    )
    expect(flight.unmountLater).toHaveBeenCalledWith(2)
  })

  it('resolves a frame after the clock finishes, not on the last frame', async () => {
    const { ctx } = transitionContext()
    const resolved = vi.fn()

    void runCloseChoreography(ctx).then(resolved)

    // Four 200ms steps take the 800ms clock to raw=1 and fire onDone.
    for (let i = 0; i < 4; i++) {
      frames.step(200)
    }
    await Promise.resolve()
    expect(resolved).not.toHaveBeenCalled()

    frames.step(200)
    await Promise.resolve()
    expect(resolved).toHaveBeenCalledTimes(1)
  })

  describe('when the slide has something to fly home', () => {
    it('mounts the return flight, hides the landing spot and covers the cut', () => {
      const { ctx, flight, hidden, root, sourceElement } = transitionContext()
      flyableSource(sourceElement)

      void runCloseChoreography(ctx)

      expect(flight.mount).toHaveBeenCalledTimes(1)
      expect(hidden.hide).toHaveBeenCalledWith(sourceElement)
      // Only a covered close hides the container outright.
      expect(root.classList.contains(TRANSITIONING_CLASS)).toBe(true)
    })

    it('paints the return flight every frame', () => {
      const { ctx, flight, sourceElement } = transitionContext()
      flyableSource(sourceElement)

      void runCloseChoreography(ctx)
      frames.step(200)
      frames.step(200)

      expect(flight.paint).toHaveBeenCalledTimes(2)
    })
  })

  describe('with nothing to fly home', () => {
    it('fades the container instead of hard-vanishing it', () => {
      const { ctx, flight, container, root } = transitionContext({ sourceSrc: false })

      void runCloseChoreography(ctx)
      frames.step(200)

      expect(flight.mount).not.toHaveBeenCalled()
      expect(root.classList.contains(TRANSITIONING_CLASS)).toBe(false)
      expect(container.style.opacity).not.toBe('')
    })

    it('still destroys the core and resolves', async () => {
      const { ctx, destroy } = transitionContext({ sourceSrc: false })

      const done = runCloseChoreography(ctx)
      settle()
      await done

      expect(destroy).toHaveBeenCalledTimes(1)
    })

    it('does not fly a video slide whose trigger wraps no video element', () => {
      const { ctx, flight, sourceElement } = transitionContext({
        slides: [{ key: 'v', type: 'video', src: 'https://youtu.be/x' }]
      })
      flyableSource(sourceElement)

      void runCloseChoreography(ctx)

      // A photo morphing into a 16:9 player changes shape mid-flight.
      expect(flight.mount).not.toHaveBeenCalled()
    })

    it('fades the cover in for a video slide that does wrap one', () => {
      const { ctx, flight, sourceElement } = transitionContext({
        slides: [{ key: 'v', type: 'video', src: 'https://youtu.be/x' }]
      })
      const video = document.createElement('video')
      video.poster = '/poster.jpg'
      sourceElement.appendChild(video)
      giveRect(sourceElement)
      giveRect(video)

      void runCloseChoreography(ctx)

      expect(flight.mount).toHaveBeenCalledTimes(1)
      // A poster hard-mounted over a playing video is a visible cut.
      expect(flight.arrive).toHaveBeenCalledTimes(1)
    })
  })
})
