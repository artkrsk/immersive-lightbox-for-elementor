// @vitest-environment happy-dom

import { createPlayerBridge } from '@ts/video/playerBridge'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function fakeIframe() {
  const contentWindow = { postMessage: vi.fn() }
  const listeners = new Map<string, () => void>()
  const iframe = {
    contentWindow,
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: () => {}
  } as unknown as HTMLIFrameElement
  return {
    iframe,
    contentWindow,
    fireLoad: () => listeners.get('load')?.(),
    receive: (data: unknown) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: typeof data === 'string' ? data : JSON.stringify(data),
          source: contentWindow as unknown as Window
        })
      )
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('playerBridge — YouTube', () => {
  it('queues commands until onReady, then flushes in order', () => {
    const f = fakeIframe()
    const bridge = createPlayerBridge(f.iframe, 'youtube')
    bridge.play()
    bridge.setMuted(false)
    // nothing sent yet except the listening handshake on load
    f.fireLoad()
    const sentBefore = f.contentWindow.postMessage.mock.calls.map((c) => String(c[0]))
    expect(sentBefore.some((m) => m.includes('"listening"'))).toBe(true)
    expect(sentBefore.some((m) => m.includes('playVideo'))).toBe(false)

    f.receive({ event: 'onReady' })
    const sent = f.contentWindow.postMessage.mock.calls.map((c) => String(c[0]))
    const playIdx = sent.findIndex((m) => m.includes('playVideo'))
    const unmuteIdx = sent.findIndex((m) => m.includes('unMute'))
    expect(playIdx).toBeGreaterThan(-1)
    expect(unmuteIdx).toBeGreaterThan(playIdx)

    // post-ready commands go straight through
    bridge.pause()
    expect(
      f.contentWindow.postMessage.mock.calls
        .map((c) => String(c[0]))
        .some((m) => m.includes('pauseVideo'))
    ).toBe(true)
    bridge.destroy()
  })

  it('ignores messages from other sources', () => {
    const f = fakeIframe()
    const bridge = createPlayerBridge(f.iframe, 'youtube')
    bridge.play()
    window.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify({ event: 'onReady' }) })
    )
    const sent = f.contentWindow.postMessage.mock.calls.map((c) => String(c[0]))
    expect(sent.some((m) => m.includes('playVideo'))).toBe(false)
    bridge.destroy()
  })
})

describe('playerBridge — Vimeo', () => {
  it('pings until ready, then flushes and stops pinging', () => {
    const f = fakeIframe()
    const bridge = createPlayerBridge(f.iframe, 'vimeo')
    bridge.play()
    vi.advanceTimersByTime(600)
    const pings = f.contentWindow.postMessage.mock.calls
      .map((c) => String(c[0]))
      .filter((m) => m.includes('ping')).length
    expect(pings).toBeGreaterThan(1)

    f.receive({ event: 'ready' })
    const sent = f.contentWindow.postMessage.mock.calls.map((c) => String(c[0]))
    expect(sent.some((m) => m.includes('"play"'))).toBe(true)

    const before = f.contentWindow.postMessage.mock.calls.length
    vi.advanceTimersByTime(1000)
    const after = f.contentWindow.postMessage.mock.calls
      .slice(before)
      .map((c) => String(c[0]))
      .filter((m) => m.includes('ping')).length
    expect(after).toBe(0)

    bridge.setMuted(true)
    expect(
      f.contentWindow.postMessage.mock.calls
        .map((c) => String(c[0]))
        .some((m) => m.includes('setMuted'))
    ).toBe(true)
    bridge.destroy()
  })
})
