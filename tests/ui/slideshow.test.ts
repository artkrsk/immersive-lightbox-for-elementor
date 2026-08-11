import { createSlideshow } from '@ts/ui/slideshow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createSlideshow', () => {
  it('advances on the interval while playing', () => {
    const onAdvance = vi.fn()
    const show = createSlideshow(3000, onAdvance)
    show.toggle()
    expect(show.isPlaying()).toBe(true)
    vi.advanceTimersByTime(3000)
    expect(onAdvance).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(6000)
    expect(onAdvance).toHaveBeenCalledTimes(3)
  })

  it('stop halts advancing; toggle restarts', () => {
    const onAdvance = vi.fn()
    const show = createSlideshow(1000, onAdvance)
    show.toggle()
    vi.advanceTimersByTime(1000)
    show.stop()
    expect(show.isPlaying()).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(onAdvance).toHaveBeenCalledTimes(1)
    show.toggle()
    vi.advanceTimersByTime(1000)
    expect(onAdvance).toHaveBeenCalledTimes(2)
  })

  it('toggle while playing stops', () => {
    const show = createSlideshow(1000, () => {})
    show.toggle()
    show.toggle()
    expect(show.isPlaying()).toBe(false)
  })

  it('notifies state changes', () => {
    const states: boolean[] = []
    const show = createSlideshow(
      1000,
      () => {},
      (playing) => {
        states.push(playing)
      }
    )
    show.toggle()
    show.stop()
    show.stop() // already stopped — no duplicate notification
    expect(states).toEqual([true, false])
  })
})
