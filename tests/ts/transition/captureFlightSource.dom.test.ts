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
    // Frame 300×400 at (100, 200); img is 20% larger and shifted left/up —
    // a two-axis parallax state.
    mockRect(frame, { left: 100, top: 200, width: 300, height: 400 })
    mockRect(img, { left: 70, top: 152, width: 360, height: 480 })

    const source = captureFlightSource(frame)
    expect(source.rect).toEqual({ x: 100, y: 200, w: 300, h: 400 })
    expect(source.radius).toBe(18)
    expect(source.innerWidthPct).toBeCloseTo(120, 6)
    expect(source.innerHeightPct).toBeCloseTo(120, 6)
    expect(source.innerOffsetXPct).toBeCloseTo(-10, 6)
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
    expect(source.innerWidthPct).toBe(100)
    expect(source.innerHeightPct).toBe(100)
    expect(source.innerOffsetXPct).toBeCloseTo(0, 10)
    expect(source.innerOffsetYPct).toBeCloseTo(0, 10)
    expect(source.radius).toBe(6)
  })

  it('degrades to a neutral inner state when there is no img', () => {
    document.body.innerHTML = '<a href="/full.jpg" data-arts-lightbox></a>'
    const frame = document.querySelector('a') as HTMLElement
    mockRect(frame, { left: 0, top: 0, width: 200, height: 100 })
    const source = captureFlightSource(frame)
    expect(source.innerWidthPct).toBe(100)
    expect(source.innerHeightPct).toBe(100)
    expect(source.innerOffsetXPct).toBe(0)
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
    expect(source.innerWidthPct).toBeCloseTo(100, 6)
    expect(source.innerHeightPct).toBeCloseTo(120, 6)
    expect(source.innerOffsetXPct).toBeCloseTo(0, 6)
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

  describe('extras that ride the flight', () => {
    it('captures nothing when nothing is marked', () => {
      document.body.innerHTML =
        '<a href="/full.jpg" data-arts-lightbox><img src="/thumb.jpg" alt="" /></a>'
      const frame = document.querySelector('a') as HTMLElement
      mockRect(frame, { left: 0, top: 0, width: 300, height: 400 })
      expect(captureFlightSource(frame).extras).toEqual([])
    })

    it('measures a marked caption against the frame and keeps its computed look', () => {
      // The caption is OUTSIDE the clip box, a sibling inside the anchor —
      // the walk starts at the clicked element, not the frame.
      document.body.innerHTML = `
        <a href="/full.jpg" data-arts-lightbox>
          <span class="frame" style="overflow: hidden">
            <img src="/thumb.jpg" alt="" />
            <i data-arts-lightbox-fly="veil" style="background-color: rgb(35, 35, 35); opacity: 0.3"></i>
          </span>
          <b data-arts-lightbox-fly="caption" style="color: rgb(255, 255, 255)">Garden Curve</b>
        </a>
      `
      const anchor = document.querySelector('a') as HTMLElement
      const frame = document.querySelector('.frame') as HTMLElement
      const img = frame.querySelector('img') as HTMLImageElement
      const veil = document.querySelector('i') as HTMLElement
      const caption = document.querySelector('b') as HTMLElement
      mockRect(anchor, { left: 100, top: 200, width: 300, height: 400 })
      mockRect(frame, { left: 100, top: 200, width: 300, height: 400 })
      mockRect(img, { left: 100, top: 200, width: 300, height: 400 })
      mockRect(veil, { left: 100, top: 200, width: 300, height: 400 })
      mockRect(caption, { left: 130, top: 540, width: 150, height: 40 })

      const { extras } = captureFlightSource(anchor)
      expect(extras.map((extra) => extra.kind)).toEqual(['veil', 'caption'])
      const [veilExtra, captionExtra] = extras
      expect(veilExtra?.opacity).toBeCloseTo(0.3, 6)
      expect(veilExtra?.styles.backgroundColor).toBe('rgb(35, 35, 35)')
      // Fractions of the frame: 30/300 across, 340/400 down, 150x40 on screen.
      expect(captionExtra?.x).toBeCloseTo(0.1, 6)
      expect(captionExtra?.y).toBeCloseTo(0.85, 6)
      expect(captionExtra?.w).toBeCloseTo(0.5, 6)
      expect(captionExtra?.h).toBeCloseTo(0.1, 6)
      expect(captionExtra?.width).toBe(150)
      expect(captionExtra?.height).toBe(40)
      expect(captionExtra?.element).toBe(caption)
      expect(captionExtra?.hover).toBe(false)
      expect(captionExtra?.styles.color).toBe('rgb(255, 255, 255)')
    })

    it('ignores a marker with an unknown kind', () => {
      document.body.innerHTML = `
        <a href="/full.jpg" data-arts-lightbox>
          <img src="/thumb.jpg" alt="" />
          <b data-arts-lightbox-fly="badge">x</b>
        </a>
      `
      const frame = document.querySelector('a') as HTMLElement
      mockRect(frame, { left: 0, top: 0, width: 300, height: 400 })
      expect(captureFlightSource(frame).extras).toEqual([])
    })
  })
})
