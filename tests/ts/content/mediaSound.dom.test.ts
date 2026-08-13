// @vitest-environment happy-dom

import { bridgeSound } from '@ts/content/bridgeSound'
import { videoElementSound } from '@ts/content/videoElementSound'
import type { IMediaState, IPlayerBridge } from '@ts/interfaces'
import { audioFocus } from '@ts/video/audioFocus'
import { afterEach, describe, expect, it, vi } from 'vitest'

function fakeVideo(): HTMLVideoElement {
  const el = document.createElement('video')
  el.muted = true
  el.play = vi.fn(() => Promise.resolve())
  return el
}

function fakeBridgeState() {
  const iframe = document.createElement('iframe')
  const bridge: IPlayerBridge = {
    play: vi.fn(),
    pause: vi.fn(),
    setMuted: vi.fn(),
    destroy: vi.fn()
  }
  const state = {
    bridges: new Map([[iframe, bridge]]),
    bridgeMuted: new Map<HTMLIFrameElement, boolean>(),
    watchIntent: { index: -1 },
    slideAutoplay: () => true
  } as unknown as IMediaState
  return { iframe, bridge, state }
}

afterEach(() => {
  audioFocus.releaseAll()
})

describe('videoElementSound', () => {
  it('reports the element mute state', () => {
    const el = fakeVideo()
    expect(videoElementSound(el).muted).toBe(true)
    el.muted = false
    expect(videoElementSound(el).muted).toBe(false)
  })

  it('unmuting resumes playback', () => {
    const el = fakeVideo()
    videoElementSound(el).setMuted(false)
    expect(el.muted).toBe(false)
    expect(el.play).toHaveBeenCalled()
  })

  it('muting never starts playback', () => {
    const el = fakeVideo()
    el.muted = false
    videoElementSound(el).setMuted(true)
    expect(el.muted).toBe(true)
    expect(el.play).not.toHaveBeenCalled()
  })

  it('a second element claiming focus re-mutes the first', () => {
    const first = fakeVideo()
    const second = fakeVideo()
    videoElementSound(first).setMuted(false)
    videoElementSound(second).setMuted(false)
    expect(first.muted).toBe(true)
    expect(second.muted).toBe(false)
  })

  it('re-claiming by the same element does not self-mute', () => {
    const el = fakeVideo()
    videoElementSound(el).setMuted(false)
    videoElementSound(el).setMuted(false)
    expect(el.muted).toBe(false)
  })
})

describe('bridgeSound', () => {
  it('is null when the iframe has no registered bridge', () => {
    const { state } = fakeBridgeState()
    expect(bridgeSound(document.createElement('iframe'), state)).toBeNull()
  })

  it('reads muted from the mirror, defaulting to muted', () => {
    const { iframe, state } = fakeBridgeState()
    expect(bridgeSound(iframe, state)?.muted).toBe(true)
    state.bridgeMuted.set(iframe, false)
    expect(bridgeSound(iframe, state)?.muted).toBe(false)
  })

  it('unmuting plays and mirrors the new state', () => {
    const { iframe, bridge, state } = fakeBridgeState()
    bridgeSound(iframe, state)?.setMuted(false)
    expect(bridge.setMuted).toHaveBeenCalledWith(false)
    expect(bridge.play).toHaveBeenCalled()
    expect(state.bridgeMuted.get(iframe)).toBe(false)
  })

  it('muting mirrors without playing', () => {
    const { iframe, bridge, state } = fakeBridgeState()
    bridgeSound(iframe, state)?.setMuted(true)
    expect(state.bridgeMuted.get(iframe)).toBe(true)
    expect(bridge.play).not.toHaveBeenCalled()
  })

  it('losing focus re-mutes the bridge AND its mirror', () => {
    const { iframe, bridge, state } = fakeBridgeState()
    bridgeSound(iframe, state)?.setMuted(false)
    audioFocus.claim(fakeVideo(), () => {})
    expect(bridge.setMuted).toHaveBeenLastCalledWith(true)
    expect(state.bridgeMuted.get(iframe)).toBe(true)
  })
})
