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

  it('degrades to a neutral inner state when there is no img', () => {
    document.body.innerHTML = '<a href="/full.jpg" data-arts-lightbox></a>'
    const frame = document.querySelector('a') as HTMLElement
    mockRect(frame, { left: 0, top: 0, width: 200, height: 100 })
    const source = captureFlightSource(frame)
    expect(source.innerHeightPct).toBe(100)
    expect(source.innerOffsetYPct).toBe(0)
    expect(source.src).toBe('')
  })
})
