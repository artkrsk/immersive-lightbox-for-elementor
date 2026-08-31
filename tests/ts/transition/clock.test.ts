import { createClock } from '@ts/transition/clock'
import { beforeEach, describe, expect, it } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'

/** Deterministic rAF: each flush advances one frame at 100ms. */
let frames: ReturnType<typeof installFrameClock>

function flushFrame(ms = 100) {
  frames.step(ms)
}

beforeEach(() => {
  frames = installFrameClock()
})

describe('createClock', () => {
  it('drives eased frames and completes exactly once', () => {
    const frames: Array<[number, number]> = []
    let doneCount = 0
    createClock(
      400,
      (t) => t * t,
      (eased, raw) => {
        frames.push([eased, raw])
      },
      () => {
        doneCount++
      }
    )
    flushFrame() // 100ms → raw 0.25
    flushFrame() // 200ms → raw 0.5
    flushFrame() // 300ms → raw 0.75
    flushFrame() // 400ms → raw 1
    flushFrame() // no further frames scheduled
    expect(frames.length).toBe(4)
    expect(frames[0]).toEqual([0.0625, 0.25])
    expect(frames[1]).toEqual([0.25, 0.5])
    expect(frames[3]).toEqual([1, 1])
    expect(doneCount).toBe(1)
  })

  it('cancel stops the loop before completion', () => {
    const frames: number[] = []
    let done = false
    const clock = createClock(
      400,
      (t) => t,
      (eased) => {
        frames.push(eased)
      },
      () => {
        done = true
      }
    )
    flushFrame()
    clock.cancel()
    flushFrame()
    flushFrame()
    expect(frames.length).toBe(1)
    expect(done).toBe(false)
  })
})
