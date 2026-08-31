// @vitest-environment happy-dom

import { pointerTravel } from '@ts/collector/pointerTravel'
import { beforeEach, describe, expect, it } from 'vitest'

// isPrimary defaults to false in the constructor init (unlike real pointers,
// which are primary whenever they're the only one) — set it the way a lone
// mouse or first finger would arrive.
function press(x: number, y: number, init: PointerEventInit = {}): void {
  document.body.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      isPrimary: true,
      clientX: x,
      clientY: y,
      ...init
    })
  )
}

function move(x: number, y: number): void {
  document.body.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, isPrimary: true, clientX: x, clientY: y })
  )
}

function release(x: number, y: number): void {
  document.body.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, isPrimary: true, clientX: x, clientY: y })
  )
}

function clickAt(x: number, y: number): MouseEvent {
  return new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })
}

describe('pointerTravel', () => {
  beforeEach(() => {
    pointerTravel.observe()
  })

  it('reads a clean click as not-a-drag', () => {
    press(100, 100)
    release(101, 101)
    expect(pointerTravel.consumeClick(clickAt(101, 101))).toBe(false)
  })

  it('reads a click whose press travelled past the gate as a drag', () => {
    press(100, 100)
    move(160, 100)
    release(160, 100)
    expect(pointerTravel.consumeClick(clickAt(160, 100))).toBe(true)
  })

  it('still catches a drag that returned to its press point', () => {
    // A grab-flick-and-settle can release where it started; the click lands
    // on the press point but the user was unmistakably dragging.
    press(100, 100)
    move(200, 100)
    move(100, 100)
    release(100, 100)
    expect(pointerTravel.consumeClick(clickAt(100, 100))).toBe(true)
  })

  it('catches travel even when no pointermove was delivered', () => {
    // Coalesced or throttled moves: the click coordinates alone reveal it.
    press(100, 100)
    release(180, 100)
    expect(pointerTravel.consumeClick(clickAt(180, 100))).toBe(true)
  })

  it('consumes one press per click, so a keyboard click cannot inherit a drag', () => {
    press(100, 100)
    move(200, 100)
    release(200, 100)
    pointerTravel.consumeClick(clickAt(200, 100))
    // Enter on a focused link fires a click with no press behind it.
    expect(pointerTravel.consumeClick(clickAt(0, 0))).toBe(false)
  })

  it('ignores hover movement between presses', () => {
    press(100, 100)
    release(100, 100)
    move(600, 600)
    expect(pointerTravel.consumeClick(clickAt(100, 100))).toBe(false)
  })

  it('forgets a cancelled press', () => {
    press(100, 100)
    move(300, 100)
    document.body.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, isPrimary: true })
    )
    expect(pointerTravel.consumeClick(clickAt(100, 100))).toBe(false)
  })

  it('forgets a press that became a native drag', () => {
    // dragstart normally means no click will ever fire — clearing keeps a
    // later keyboard click from inheriting this press's travel.
    press(100, 100)
    move(300, 100)
    document.body.dispatchEvent(new Event('dragstart', { bubbles: true }))
    expect(pointerTravel.consumeClick(clickAt(100, 100))).toBe(false)
  })

  it('holds at the gate boundary and trips just past it', () => {
    press(100, 100)
    release(106, 100)
    expect(pointerTravel.consumeClick(clickAt(106, 100))).toBe(false)
    press(100, 100)
    release(107, 100)
    expect(pointerTravel.consumeClick(clickAt(107, 100))).toBe(true)
  })

  it('ignores non-primary pointers', () => {
    press(100, 100, { isPrimary: false })
    move(400, 100)
    expect(pointerTravel.consumeClick(clickAt(100, 100))).toBe(false)
  })
})
