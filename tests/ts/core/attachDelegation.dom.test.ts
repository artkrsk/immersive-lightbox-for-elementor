// @vitest-environment happy-dom

import { attachDelegation } from '@ts/core/attachDelegation'
import { describe, expect, it, vi } from 'vitest'

function handlers() {
  return { open: vi.fn(), close: vi.fn(), next: vi.fn(), prev: vi.fn() }
}

describe('attachDelegation', () => {
  it('stops a claimed click from reaching bubble-phase delegations', () => {
    // Elementor's native lightbox binds a jQuery bubble-phase delegation on
    // document. If a claimed click still reaches it, BOTH lightboxes open —
    // preventDefault alone does not stop its handler from running.
    document.body.innerHTML = '<a href="/a.jpg" data-arts-lightbox><img src="t.jpg" alt=""/></a>'
    const h = handlers()
    const detach = attachDelegation(h)
    const bubble = vi.fn()
    document.addEventListener('click', bubble)

    document.querySelector('img')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(h.open).toHaveBeenCalledTimes(1)
    expect(bubble).not.toHaveBeenCalled()
    document.removeEventListener('click', bubble)
    detach()
  })

  it('swallows the click that ends a drag on a candidate', () => {
    // Dragging a carousel ends with a click on whatever slide the pointer
    // released over. Every dragger kills that click at capture phase on its
    // own element — AFTER our document-capture claim, so the guard is ours.
    // Swallowed, not declined: an unclaimed candidate click would fall
    // through to Elementor's bubble delegation and open the native lightbox.
    document.body.innerHTML = '<a href="/a.jpg" data-arts-lightbox><img src="t.jpg" alt=""/></a>'
    const h = handlers()
    const detach = attachDelegation(h)
    const bubble = vi.fn()
    document.addEventListener('click', bubble)
    const img = document.querySelector('img') as HTMLElement

    const pointer = (type: string, x: number): void => {
      img.dispatchEvent(
        new PointerEvent(type, { bubbles: true, isPrimary: true, clientX: x, clientY: 50 })
      )
    }
    pointer('pointerdown', 100)
    pointer('pointermove', 240)
    pointer('pointerup', 240)
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 240,
      clientY: 50
    })
    img.dispatchEvent(click)

    expect(h.open).not.toHaveBeenCalled()
    expect(click.defaultPrevented).toBe(true)
    expect(bubble).not.toHaveBeenCalled()

    // The drag verdict dies with its click — the next clean one opens.
    img.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(h.open).toHaveBeenCalledTimes(1)
    document.removeEventListener('click', bubble)
    detach()
  })

  it('leaves unclaimed clicks propagating normally', () => {
    document.body.innerHTML = '<a href="/page.html" id="plain">x</a>'
    const h = handlers()
    const detach = attachDelegation(h)
    const bubble = vi.fn((e: Event) => e.preventDefault())
    document.addEventListener('click', bubble)

    document.querySelector('#plain')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(h.open).not.toHaveBeenCalled()
    expect(bubble).toHaveBeenCalledTimes(1)
    document.removeEventListener('click', bubble)
    detach()
  })
})
