// @vitest-environment happy-dom

import type { ISlideData } from '@ts/interfaces'
import { slideFlies } from '@ts/transition/slideFlies'
import { describe, expect, it } from 'vitest'

function slide(over: Partial<ISlideData>): ISlideData {
  return { key: 'k', type: 'image', src: 's', ...over }
}

function trigger(html: string): HTMLElement {
  const a = document.createElement('a')
  a.innerHTML = html
  return a
}

const PHOTO = '<img src="photo.jpg" width="1400" height="1648" alt="" />'
const PLAYER = '<video src="clip.mp4" width="1280" height="720" poster="p.jpg"></video>'

describe('slideFlies', () => {
  it('flies an image whatever it wrapped', () => {
    expect(slideFlies(slide({ type: 'image' }), trigger(PHOTO))).toBe(true)
  })

  // The poster of a wrapped <video> IS a frame of it, and the slide's box came
  // from that same element — both ends of the morph agree.
  it('flies a video slide that wrapped a player', () => {
    expect(slideFlies(slide({ type: 'video' }), trigger(PLAYER))).toBe(true)
  })

  // Every one of these boxes the slide at 16:9 (or at stated dims) while the
  // trigger is arbitrary art, so the morph would change shape mid-flight.
  it('refuses a video slide hung on a photograph, whatever the provider', () => {
    expect(slideFlies(slide({ type: 'video', videoEmbed: 'vimeo' }), trigger(PHOTO))).toBe(false)
    expect(slideFlies(slide({ type: 'video', videoEmbed: 'youtube' }), trigger(PHOTO))).toBe(false)
    // A bare .mp4 link on a photo is the same shape of problem.
    expect(slideFlies(slide({ type: 'video' }), trigger(PHOTO))).toBe(false)
  })

  it('refuses a video slide whose trigger has no visual at all', () => {
    expect(slideFlies(slide({ type: 'video' }), trigger('Watch the film'))).toBe(false)
    expect(slideFlies(slide({ type: 'video' }), null)).toBe(false)
  })

  it('says nothing about slides it does not judge', () => {
    expect(slideFlies(slide({ type: 'html' }), null)).toBe(true)
    expect(slideFlies(undefined, null)).toBe(true)
  })
})
