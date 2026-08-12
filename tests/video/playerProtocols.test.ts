import { vimeoProtocol, youtubeProtocol } from '@ts/video/playerProtocols'
import { describe, expect, it } from 'vitest'

describe('youtubeProtocol', () => {
  it('handshakes with the IFrame API listening frame', () => {
    expect(JSON.parse(youtubeProtocol.handshake)).toEqual({
      event: 'listening',
      id: 1,
      channel: 'widget'
    })
  })

  it('has a load-time ready signal, so it never pings', () => {
    expect(youtubeProtocol.pingUntilReady).toBe(false)
  })

  it('accepts all three delivery events as readiness', () => {
    expect(youtubeProtocol.isReadyEvent('onReady')).toBe(true)
    expect(youtubeProtocol.isReadyEvent('initialDelivery')).toBe(true)
    expect(youtubeProtocol.isReadyEvent('infoDelivery')).toBe(true)
  })

  it('rejects Vimeo readiness and absent events', () => {
    expect(youtubeProtocol.isReadyEvent('ready')).toBe(false)
    expect(youtubeProtocol.isReadyEvent(undefined)).toBe(false)
  })

  it('encodes transport commands', () => {
    expect(JSON.parse(youtubeProtocol.play())).toEqual({
      event: 'command',
      func: 'playVideo',
      args: ''
    })
    expect(JSON.parse(youtubeProtocol.pause()).func).toBe('pauseVideo')
  })

  it('mute and unMute are separate commands, not an argument', () => {
    expect(JSON.parse(youtubeProtocol.setMuted(true)).func).toBe('mute')
    expect(JSON.parse(youtubeProtocol.setMuted(false)).func).toBe('unMute')
  })
})

describe('vimeoProtocol', () => {
  it('handshakes with a bare ping and repeats it', () => {
    expect(JSON.parse(vimeoProtocol.handshake)).toEqual({ method: 'ping' })
    expect(vimeoProtocol.pingUntilReady).toBe(true)
  })

  it('accepts only the ready event', () => {
    expect(vimeoProtocol.isReadyEvent('ready')).toBe(true)
    expect(vimeoProtocol.isReadyEvent('onReady')).toBe(false)
    expect(vimeoProtocol.isReadyEvent(undefined)).toBe(false)
  })

  it('omits value entirely for argument-less methods', () => {
    expect(JSON.parse(vimeoProtocol.play())).toEqual({ method: 'play' })
    expect(JSON.parse(vimeoProtocol.pause())).toEqual({ method: 'pause' })
  })

  it('carries mute as a boolean value', () => {
    expect(JSON.parse(vimeoProtocol.setMuted(true))).toEqual({
      method: 'setMuted',
      value: true
    })
    expect(JSON.parse(vimeoProtocol.setMuted(false))).toEqual({
      method: 'setMuted',
      value: false
    })
  })
})
