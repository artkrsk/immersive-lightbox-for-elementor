// @vitest-environment happy-dom

import { playingSignal } from '@ts/video/playingSignal'
import { describe, expect, it } from 'vitest'

describe('playingSignal', () => {
  it('stores and resolves a per-element playback promise', async () => {
    const el = document.createElement('video')
    let fire = () => {}
    playingSignal.set(
      el,
      new Promise<void>((resolve) => {
        fire = resolve
      })
    )
    const got = playingSignal.get(el)
    expect(got).toBeDefined()
    let resolved = false
    void got?.then(() => {
      resolved = true
    })
    fire()
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('returns undefined for elements with no signal', () => {
    expect(playingSignal.get(document.createElement('div'))).toBeUndefined()
  })
})
