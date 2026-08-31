// @vitest-environment happy-dom

import type { IGallery, IOpenRequest } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { findCloseSource } from '@ts/transition/findCloseSource'
import { beforeEach, describe, expect, it } from 'vitest'

// happy-dom viewport: 1024x768.
function mockRect(
  el: HTMLElement,
  rect: { top: number; height: number; width: number; left?: number }
): void {
  const left = rect.left ?? 0
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      bottom: rect.top + rect.height,
      left,
      right: left + rect.width,
      width: rect.width,
      height: rect.height,
      x: left,
      y: rect.top
    }) as DOMRect
}

function scene(): { req: IOpenRequest; original: HTMLElement; clone: HTMLElement } {
  document.body.innerHTML = '<a id="o" href="/a.jpg"></a><a id="c" href="/a.jpg"></a>'
  const original = document.querySelector('#o') as HTMLElement
  const clone = document.querySelector('#c') as HTMLElement
  const gallery: IGallery = {
    id: 'g',
    slides: [{ key: 'a', type: 'image', src: '/a.jpg' }],
    elementsByKey: new Map([['a', [original, clone]]])
  }
  return { req: { gallery, index: 0, sourceElement: original }, original, clone }
}

/** A Swiper-style loop: one overflow-hidden window, clones on both flanks. */
function carouselScene(): { req: IOpenRequest; flank: HTMLElement; inWindow: HTMLElement } {
  document.body.innerHTML = `
    <div id="win">
      <a id="flank" href="/a.jpg"></a>
      <a id="opened" href="/b.jpg"></a>
      <a id="inwin" href="/a.jpg"></a>
    </div>`
  const win = document.querySelector('#win') as HTMLElement
  win.style.overflow = 'hidden'
  mockRect(win, { top: 200, height: 300, width: 900, left: 60 })
  const flank = document.querySelector('#flank') as HTMLElement
  const opened = document.querySelector('#opened') as HTMLElement
  const inWindow = document.querySelector('#inwin') as HTMLElement
  // The flank clone sits far left of the window — same vertical band.
  mockRect(flank, { top: 200, height: 300, width: 300, left: -1800 })
  mockRect(opened, { top: 200, height: 300, width: 300, left: 60 })
  mockRect(inWindow, { top: 200, height: 300, width: 300, left: 400 })
  const gallery: IGallery = {
    id: 'g',
    slides: [
      { key: 'b', type: 'image', src: '/b.jpg' },
      { key: 'a', type: 'image', src: '/a.jpg' }
    ],
    elementsByKey: new Map([
      ['b', [opened]],
      ['a', [flank, inWindow]]
    ])
  }
  return { req: { gallery, index: 0, sourceElement: opened }, flank, inWindow }
}

const pswp = { currIndex: 0 } as unknown as PhotoSwipe
const pswpAt = (currIndex: number) => ({ currIndex }) as unknown as PhotoSwipe

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('findCloseSource', () => {
  it('prefers the element the user opened from while it is on screen', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: 100, height: 200, width: 300 })
    mockRect(clone, { top: 400, height: 200, width: 300 })
    expect(findCloseSource(pswp, req)).toBe(original)
  })

  it('keeps preferring an original the open hid via visibility', () => {
    // The open hides its source with `visibility: hidden` (hiddenSources) and
    // the close lands on that rect so the restore is seamless. The test is
    // geometric on purpose — a style-based one would break this contract.
    const { req, original, clone } = scene()
    original.style.visibility = 'hidden'
    mockRect(original, { top: 100, height: 200, width: 300 })
    mockRect(clone, { top: 400, height: 200, width: 300 })
    expect(findCloseSource(pswp, req)).toBe(original)
  })

  it('falls back to an on-screen clone when the original scrolled away', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: -900, height: 200, width: 300 }) // above the viewport
    mockRect(clone, { top: 400, height: 200, width: 300 })
    expect(findCloseSource(pswp, req)).toBe(clone)
  })

  it('still flies to a thumb half below the fold', () => {
    // The viewport clips the flight and the thumb identically — nothing pops,
    // so a partially folded landing stays a flight, not a fade.
    const { req, original, clone } = scene()
    mockRect(original, { top: -900, height: 200, width: 300 })
    mockRect(clone, { top: 700, height: 200, width: 300 }) // 68px of 200 visible
    expect(findCloseSource(pswp, req)).toBe(clone)
  })

  it('returns null when no instance is visible', () => {
    const { req, original, clone } = scene()
    mockRect(original, { top: -900, height: 200, width: 300 })
    mockRect(clone, { top: 0, height: 0, width: 0 }) // zero-size = not rendered
    expect(findCloseSource(pswp, req)).toBeNull()
  })
})

describe('findCloseSource — loop-cloned carousels', () => {
  it('refuses a clone its overflow window has clipped away, whatever the DOM order', () => {
    // The flank duplicate shares the visible clones' vertical band, so a
    // viewport band test passes it — and the close flew a viewport off
    // screen, to the FIRST instance of the key. The clip walk refuses it;
    // the clone inside the window wins.
    const { req, flank, inWindow } = carouselScene()
    expect(findCloseSource(pswpAt(1), req)).toBe(inWindow)
    expect(findCloseSource(pswpAt(1), req)).not.toBe(flank)
  })

  it('fades — returns null — when every instance is outside the window', () => {
    const { req, inWindow } = carouselScene()
    // Push the in-window clone out too: only flank positions remain.
    mockRect(inWindow, { top: 200, height: 300, width: 300, left: 1300 })
    expect(findCloseSource(pswpAt(1), req)).toBeNull()
  })

  it('refuses a clone the window cuts to a sliver', () => {
    // A peek layout: 30% of the clone pokes into the window. The flight
    // paints unclipped, so landing there would pop the hidden 70% away at
    // unmount — near-full visibility or nothing.
    const { req, inWindow } = carouselScene()
    mockRect(inWindow, { top: 200, height: 300, width: 300, left: -150 }) // 90px inside
    expect(findCloseSource(pswpAt(1), req)).toBeNull()
  })
})
