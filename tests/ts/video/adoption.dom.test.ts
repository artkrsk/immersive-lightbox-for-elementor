// @vitest-environment happy-dom

import { adoptVideo } from '@ts/video/adoptVideo'
import { cloneAndSeek } from '@ts/video/cloneAndSeek'
import { findAdoptableVideo } from '@ts/video/findAdoptableVideo'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ''
  // happy-dom media elements have no playback engine
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

function mountCandidate(videoAttrs = ''): HTMLElement {
  document.body.innerHTML = `
    <div id="candidate">
      <span class="frame">
        <video src="/bg.mp4" ${videoAttrs}></video>
      </span>
    </div>
  `
  return document.querySelector('#candidate') as HTMLElement
}

describe('findAdoptableVideo', () => {
  it('rejects display:none texture sources and sourceless videos', () => {
    const hidden = mountCandidate('style="display: none"')
    expect(findAdoptableVideo(hidden)).toBeNull()

    document.body.innerHTML = '<div id="candidate"><video></video></div>'
    expect(findAdoptableVideo(document.querySelector('#candidate') as HTMLElement)).toBeNull()
  })
})

describe('adoptVideo', () => {
  it('take() pins every page-owned motion channel inline', () => {
    const candidate = mountCandidate('style="--dy: 0.1"')
    const video = candidate.querySelector('video') as HTMLVideoElement
    const adopted = adoptVideo(video)
    const el = adopted.take()
    expect(el).toBe(video)
    expect(el.style.getPropertyValue('translate')).toBe('0 0')
    expect(el.style.getPropertyValue('scale')).toBe('1')
    expect(el.style.getPropertyValue('transform')).toBe('none')
    // animations override inline pins; transitions lag the flight's painting
    expect(el.style.getPropertyValue('animation')).toBe('none')
    expect(el.style.getPropertyValue('transition')).toBe('none')
    expect(adopted.home?.className).toBe('frame')
  })

  it('return() restores placement, exact cssText and mute; idempotent', () => {
    const candidate = mountCandidate('style="--dy: 0.1" muted')
    const video = candidate.querySelector('video') as HTMLVideoElement
    const home = video.parentElement as HTMLElement
    video.muted = true
    const adopted = adoptVideo(video)

    const flight = document.createElement('div')
    document.body.appendChild(flight)
    flight.appendChild(adopted.take())
    video.muted = false // sound button unmuted it inside the lightbox
    video.controls = true

    adopted.return()
    expect(video.parentElement).toBe(home)
    expect(video.style.cssText).toBe('--dy: 0.1;')
    expect(video.muted).toBe(true)
    expect(video.controls).toBe(false)

    // second return is a no-op (destroy-path safety runs after the close)
    video.remove()
    adopted.return()
    expect(video.parentElement).toBeNull()
  })
})

describe('cloneAndSeek', () => {
  it('builds a muted autoplaying clone synced to the source playhead', () => {
    const candidate = mountCandidate()
    const source = candidate.querySelector('video') as HTMLVideoElement
    source.loop = true
    Object.defineProperty(source, 'currentTime', { value: 7.5, configurable: true })

    const clone = cloneAndSeek(source)
    expect(clone).not.toBe(source)
    expect(clone.muted).toBe(true)
    expect(clone.autoplay).toBe(true)
    expect(clone.playsInline).toBe(true)
    expect(clone.loop).toBe(true)
    expect(clone.getAttribute('src') ?? clone.src).toContain('/bg.mp4')

    clone.dispatchEvent(new Event('loadedmetadata'))
    expect(clone.currentTime).toBe(7.5)
  })
})
