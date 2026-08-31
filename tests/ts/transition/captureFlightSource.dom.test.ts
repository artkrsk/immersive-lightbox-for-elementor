// @vitest-environment happy-dom

import { captureFlightSource } from '@ts/transition/captureFlightSource'
import { describe, expect, it } from 'vitest'

function mockRect(el: Element, rect: Partial<DOMRect>) {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      right: 0,
      bottom: 0,
      ...rect
    }) as DOMRect
}

describe('captureFlightSource', () => {
  it('captures rect, radius and the geometric parallax state of the inner img', () => {
    document.body.innerHTML = `
      <a href="/full.jpg" data-arts-lightbox style="border-radius: 18px">
        <img src="/thumb.jpg" alt="" />
      </a>
    `
    const frame = document.querySelector('a') as HTMLElement
    const img = frame.querySelector('img') as HTMLImageElement
    // Frame 300×400 at (100, 200); img is 20% taller and shifted up 48px —
    // a mid-scroll parallax state.
    mockRect(frame, { left: 100, top: 200, width: 300, height: 400 })
    mockRect(img, { left: 100, top: 152, width: 300, height: 480 })

    const source = captureFlightSource(frame)
    expect(source.rect).toEqual({ x: 100, y: 200, w: 300, h: 400 })
    expect(source.radius).toBe(18)
    expect(source.innerHeightPct).toBeCloseTo(120, 6)
    expect(source.innerOffsetYPct).toBeCloseTo(-12, 6)
    // currentSrc resolves absolute in real browsers and happy-dom alike
    expect(source.src).toContain('/thumb.jpg')
  })

  it('measures the media box when the frame is inline — a line box is not the visual box', () => {
    // Plain WP content: <p><a><img>. The inline anchor's rect is its text
    // LINE BOX (a ~21px sliver at the baseline, the image floating far above
    // it) — launching from it collapses the flight to a strip.
    // display stated explicitly: browsers default anchors to inline, but
    // happy-dom's UA stylesheet does not model that.
    document.body.innerHTML = `
      <p><a href="/full.jpg" data-arts-lightbox style="display: inline"><img src="/thumb.jpg" alt="" style="border-radius: 6px" /></a></p>
    `
    const frame = document.querySelector('a') as HTMLElement
    const img = frame.querySelector('img') as HTMLImageElement
    mockRect(frame, { left: 10, top: 190, width: 300, height: 21 })
    mockRect(img, { left: 10, top: 12, width: 300, height: 200 })

    const source = captureFlightSource(frame)
    expect(source.rect).toEqual({ x: 10, y: 12, w: 300, h: 200 })
    expect(source.innerHeightPct).toBe(100)
    expect(source.innerOffsetYPct).toBeCloseTo(0, 10)
    expect(source.radius).toBe(6)
  })

  it('degrades to a neutral inner state when there is no img', () => {
    document.body.innerHTML = '<a href="/full.jpg" data-arts-lightbox></a>'
    const frame = document.querySelector('a') as HTMLElement
    mockRect(frame, { left: 0, top: 0, width: 200, height: 100 })
    const source = captureFlightSource(frame)
    expect(source.innerHeightPct).toBe(100)
    expect(source.innerOffsetYPct).toBe(0)
    expect(source.src).toBe('')
  })

  it('falls back to the inner img radius when the frame has none and does not clip', () => {
    document.body.innerHTML = `
      <a href="/full.jpg" data-arts-lightbox>
        <img src="/thumb.jpg" alt="" style="border-radius: 12px" />
      </a>
    `
    const frame = document.querySelector('a') as HTMLElement
    const img = frame.querySelector('img') as HTMLImageElement
    mockRect(frame, { left: 0, top: 0, width: 300, height: 400 })
    mockRect(img, { left: 0, top: 0, width: 300, height: 400 })
    expect(captureFlightSource(frame).radius).toBe(12)
  })

  it('measures the intermediate clip box (parallax wrapper contract)', () => {
    document.body.innerHTML = `
      <a href="/full.jpg" data-arts-lightbox>
        <span style="overflow: hidden; border-radius: 16px">
          <img src="/thumb.jpg" alt="" />
        </span>
      </a>
    `
    const anchor = document.querySelector('a') as HTMLElement
    const frame = document.querySelector('span') as HTMLElement
    const img = frame.querySelector('img') as HTMLImageElement
    mockRect(anchor, { left: 90, top: 190, width: 320, height: 420 })
    mockRect(frame, { left: 100, top: 200, width: 300, height: 400 })
    mockRect(img, { left: 100, top: 160, width: 300, height: 480 })

    const source = captureFlightSource(anchor)
    // the clip box is the visible card — its rect and radius win
    expect(source.rect).toEqual({ x: 100, y: 200, w: 300, h: 400 })
    expect(source.radius).toBe(16)
    expect(source.innerHeightPct).toBeCloseTo(120, 6)
    expect(source.innerOffsetYPct).toBeCloseTo(-10, 6)
  })

  it('ignores the img radius when the frame clips it away', () => {
    document.body.innerHTML = `
      <a href="/full.jpg" data-arts-lightbox style="overflow: hidden">
        <img src="/thumb.jpg" alt="" style="border-radius: 12px" />
      </a>
    `
    const frame = document.querySelector('a') as HTMLElement
    const img = frame.querySelector('img') as HTMLImageElement
    mockRect(frame, { left: 0, top: 0, width: 300, height: 400 })
    mockRect(img, { left: 0, top: -20, width: 300, height: 480 })
    expect(captureFlightSource(frame).radius).toBe(0)
  })
})
