import type { IPlayerProtocol } from '../interfaces'

const yt = (func: string): string => JSON.stringify({ event: 'command', func, args: '' })
const vimeo = (method: string, value?: unknown): string =>
  JSON.stringify(value === undefined ? { method } : { method, value })

/**
 * YouTube IFrame API postMessage protocol: the `listening` handshake goes out
 * on iframe load, and any of three delivery events proves the player is up.
 */
export const youtubeProtocol: IPlayerProtocol = {
  handshake: JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
  pingUntilReady: false,
  isReadyEvent: (event) =>
    event === 'onReady' || event === 'initialDelivery' || event === 'infoDelivery',
  // infoDelivery streams player state; 1 is "playing" in the IFrame API.
  isPlayingEvent: (data) =>
    (data as { info?: { playerState?: number } } | null)?.info?.playerState === 1,
  play: () => yt('playVideo'),
  pause: () => yt('pauseVideo'),
  setMuted: (muted) => yt(muted ? 'mute' : 'unMute')
}

/** Vimeo player.js wire protocol: ping until the `ready` event answers. */
export const vimeoProtocol: IPlayerProtocol = {
  handshake: vimeo('ping'),
  pingUntilReady: true,
  isReadyEvent: (event) => event === 'ready',
  isPlayingEvent: (data) => {
    const event = (data as { event?: string } | null)?.event
    return event === 'play' || event === 'playProgress'
  },
  play: () => vimeo('play'),
  pause: () => vimeo('pause'),
  setMuted: (muted) => vimeo('setMuted', muted)
}
