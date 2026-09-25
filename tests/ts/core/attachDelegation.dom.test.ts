// @vitest-environment happy-dom

import { attachDelegation } from '@ts/core/attachDelegation'
import { engineState } from '@ts/core/engineState'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, describe, expect, it, vi } from 'vitest'

function handlers() {
  return { open: vi.fn(), close: vi.fn(), next: vi.fn(), prev: vi.fn() }
}

function activeLightbox(): void {
  engineState.pswp = {} as PhotoSwipe
}

function press(key: 'ArrowLeft' | 'ArrowRight'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('attachDelegation', () => {
  afterEach(() => {
    engineState.pswp = null
    document.documentElement.removeAttribute('dir')
    document.body.innerHTML = ''
    Reflect.deleteProperty(window, 'artsImmersiveLightboxBoot')
  })

  it('releases clicks while WooCommerce owns the page and resumes afterward', () => {
    document.body.innerHTML = '<a href="/a.jpg" data-arts-lightbox><img></a>'
    window.artsImmersiveLightboxBoot = { css: '', js: '', enabled: false }
    const h = handlers()
    const detach = attachDelegation(
      h,
      false,
      () => window.artsImmersiveLightboxBoot?.enabled !== false
    )
    const img = document.querySelector('img') as HTMLImageElement
    const nativeClick = new MouseEvent('click', { bubbles: true, cancelable: true })
    img.dispatchEvent(nativeClick)
    expect(h.open).not.toHaveBeenCalled()
    expect(nativeClick.defaultPrevented).toBe(false)

    window.artsImmersiveLightboxBoot.enabled = true
    const claimed = new MouseEvent('click', { bubbles: true, cancelable: true })
    img.dispatchEvent(claimed)
    expect(h.open).toHaveBeenCalledOnce()
    expect(claimed.defaultPrevented).toBe(true)
    detach()
  })

  it('keeps standalone delegation independent of a WordPress boot flag', () => {
    document.body.innerHTML = '<a href="/a.jpg" data-arts-lightbox><img></a>'
    window.artsImmersiveLightboxBoot = { css: '', js: '', enabled: false }
    const h = handlers()
    const detach = attachDelegation(h)
    document.querySelector('img')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(h.open).toHaveBeenCalledOnce()
    detach()
  })

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

  it('uses ArrowRight for next and ArrowLeft for previous in LTR', () => {
    const h = handlers()
    activeLightbox()
    const detach = attachDelegation(h)

    const right = press('ArrowRight')
    const left = press('ArrowLeft')

    expect(h.next).toHaveBeenCalledTimes(1)
    expect(h.prev).toHaveBeenCalledTimes(1)
    expect(right.defaultPrevented).toBe(true)
    expect(left.defaultPrevented).toBe(true)
    detach()
  })

  it('uses ArrowLeft for next and ArrowRight for previous in RTL', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const h = handlers()
    activeLightbox()
    const detach = attachDelegation(h)

    const left = press('ArrowLeft')
    const right = press('ArrowRight')

    expect(h.next).toHaveBeenCalledTimes(1)
    expect(h.prev).toHaveBeenCalledTimes(1)
    expect(left.defaultPrevented).toBe(true)
    expect(right.defaultPrevented).toBe(true)
    detach()
  })
})
