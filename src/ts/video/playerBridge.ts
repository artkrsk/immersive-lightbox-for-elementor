/**
 * Readiness-queued postMessage control for embed players — the layer the
 * old stack never had: commands sent before the player's message listener
 * is up are silently dropped (exactly the just-opened slide's case), so
 * everything queues until the provider confirms readiness.
 *
 * YouTube (IFrame API postMessage protocol): post the `listening`
 * handshake on iframe load; `onReady`/`initialDelivery`/`infoDelivery`
 * marks ready. Vimeo (player.js wire protocol): ping until the `ready`
 * event. Incoming messages are matched to this bridge's iframe by
 * `event.source`.
 */
import type { IPlayerBridge } from '../interfaces'
export function createPlayerBridge(
  iframe: HTMLIFrameElement,
  provider: 'youtube' | 'vimeo'
): IPlayerBridge {
  let ready = false
  let queue: string[] = []
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const post = (message: string): void => {
    iframe.contentWindow?.postMessage(message, '*')
  }
  const send = (message: string): void => {
    if (ready) {
      post(message)
    } else {
      queue.push(message)
    }
  }
  const markReady = (): void => {
    if (ready) {
      return
    }
    ready = true
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
    for (const message of queue) {
      post(message)
    }
    queue = []
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
    const event = (data as { event?: string } | null)?.event
    if (provider === 'youtube') {
      if (event === 'onReady' || event === 'initialDelivery' || event === 'infoDelivery') {
        markReady()
      }
    } else if (event === 'ready') {
      markReady()
    }
  }
  window.addEventListener('message', onMessage)

  const handshake = (): void => {
    if (provider === 'youtube') {
      post(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }))
    } else {
      const ping = (): void => {
        post(JSON.stringify({ method: 'ping' }))
      }
      ping()
      if (!pingTimer) {
        pingTimer = setInterval(ping, 250)
      }
    }
  }
  // Every load is a FRESH player document (re-appended iframes reload) —
  // readiness starts over each time.
  const onLoad = (): void => {
    ready = false
    handshake()
  }
  iframe.addEventListener('load', onLoad)
  handshake() // in case the frame is already up

  const yt = (func: string): string => JSON.stringify({ event: 'command', func, args: '' })
  const vimeo = (method: string, value?: unknown): string =>
    JSON.stringify(value === undefined ? { method } : { method, value })

  return {
    play: () => {
      send(provider === 'youtube' ? yt('playVideo') : vimeo('play'))
    },
    pause: () => {
      send(provider === 'youtube' ? yt('pauseVideo') : vimeo('pause'))
    },
    setMuted: (muted: boolean) => {
      if (provider === 'youtube') {
        send(yt(muted ? 'mute' : 'unMute'))
      } else {
        send(vimeo('setMuted', muted))
      }
    },
    destroy: () => {
      window.removeEventListener('message', onMessage)
      iframe.removeEventListener('load', onLoad)
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
      queue = []
    }
  }
}
