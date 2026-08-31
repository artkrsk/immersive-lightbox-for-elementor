import { audioFocus } from '@ts/video/audioFocus'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  audioFocus.releaseAll()
})

describe('audioFocus', () => {
  it('a new claimant fires the previous holder’s release', () => {
    const a = vi.fn()
    const b = vi.fn()
    audioFocus.claim('a', a)
    audioFocus.claim('b', b)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
  })

  it('re-claiming by the CURRENT holder never fires its own release', () => {
    // The self-mute regression: a video re-plays (and re-claims) on every
    // slide arrival — firing its own stale release muted it on return.
    const first = vi.fn()
    const second = vi.fn()
    audioFocus.claim('video', first)
    audioFocus.claim('video', second)
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    // the refreshed callback is the live one
    audioFocus.claim('other', vi.fn())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('releaseAll fires the holder once and clears ownership', () => {
    const release = vi.fn()
    audioFocus.claim('video', release)
    audioFocus.releaseAll()
    audioFocus.releaseAll()
    expect(release).toHaveBeenCalledTimes(1)
    // ownership cleared: the same owner claiming again is a fresh claim
    const next = vi.fn()
    audioFocus.claim('video', next)
    expect(next).not.toHaveBeenCalled()
  })
})
