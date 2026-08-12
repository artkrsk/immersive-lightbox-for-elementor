/**
 * Readiness-queued postMessage control for embed players — the layer the old
 * stack never had. This is the transport: the iframe handshake, matching
 * incoming messages to THIS bridge by `event.source`, and the reload reset.
 * The wire formats live in playerProtocols, the buffering in createReadyQueue.
 */
import type { IPlayerBridge } from '../interfaces'
import { createReadyQueue } from './createReadyQueue'
import { vimeoProtocol, youtubeProtocol } from './playerProtocols'

/** Handshake cadence for providers with no load-time ready signal. */
const PING_MS = 250

export function createPlayerBridge(
  iframe: HTMLIFrameElement,
  provider: 'youtube' | 'vimeo'
): IPlayerBridge {
  const protocol = provider === 'youtube' ? youtubeProtocol : vimeoProtocol
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const post = (message: string): void => {
    iframe.contentWindow?.postMessage(message, '*')
  }
  const queue = createReadyQueue(post)

  const stopPinging = (): void => {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  const onMessage = (e: MessageEvent): void => {
    if (e.source !== iframe.contentWindow) {
      return
    }
    let data: unknown = e.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        return
      }
    }
    if (protocol.isReadyEvent((data as { event?: string } | null)?.event)) {
      stopPinging()
      queue.markReady()
    }
  }
  window.addEventListener('message', onMessage)

  const handshake = (): void => {
    post(protocol.handshake)
    if (protocol.pingUntilReady && !pingTimer) {
      pingTimer = setInterval(() => {
        post(protocol.handshake)
      }, PING_MS)
    }
  }
  // Every load is a FRESH player document (re-appended iframes reload) —
  // readiness starts over each time.
  const onLoad = (): void => {
    queue.reset()
    handshake()
  }
  iframe.addEventListener('load', onLoad)
  handshake() // in case the frame is already up

  return {
    play: () => {
      queue.send(protocol.play())
    },
    pause: () => {
      queue.send(protocol.pause())
    },
    setMuted: (muted) => {
      queue.send(protocol.setMuted(muted))
    },
    destroy: () => {
      window.removeEventListener('message', onMessage)
      iframe.removeEventListener('load', onLoad)
      stopPinging()
      queue.clear()
    }
  }
}
