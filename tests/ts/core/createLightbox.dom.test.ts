// @vitest-environment happy-dom

import { createLightbox } from '@ts/core/createLightbox'
import { engineState } from '@ts/core/engineState'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { audioFocus } from '@ts/video/audioFocus'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  engineState.pswp = null
  engineState.closeHandle = null
})

describe('createLightbox', () => {
  it('returns a lightbox instance with the public surface', () => {
    const lightbox = createLightbox()
    expect(typeof lightbox.init).toBe('function')
    expect(typeof lightbox.destroy).toBe('function')
    expect(typeof lightbox.close).toBe('function')
    expect(typeof lightbox.open).toBe('function')
    expect(lightbox.version).toBe('0.0.0-test')
  })

  it('init() wires Escape/ArrowRight/ArrowLeft through attachDelegation to the internal api', () => {
    const lightbox = createLightbox()
    lightbox.init()
    engineState.pswp = {
      destroy: vi.fn(),
      potentialIndex: 0,
      options: { loop: false },
      getNumItems: () => 3,
      canLoop: () => false,
      mainScroll: { moveIndexBy: vi.fn() }
    } as unknown as PhotoSwipe
    const close = vi.fn().mockResolvedValue(undefined)
    engineState.closeHandle = { close, isTransitioning: () => false }

    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()

    expect(close).toHaveBeenCalledTimes(1)

    lightbox.destroy()
  })

  it('close() is a safe no-op when there is no active close handle', () => {
    const lightbox = createLightbox()
    lightbox.init()
    engineState.pswp = {
      destroy: vi.fn(),
      potentialIndex: 0,
      options: { loop: false },
      getNumItems: () => 3,
      canLoop: () => false,
      mainScroll: { moveIndexBy: vi.fn() }
    } as unknown as PhotoSwipe

    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()

    lightbox.destroy()
  })

  it('close() resolves through the active close handle, so a caller can await the teardown', async () => {
    const lightbox = createLightbox()
    let land: () => void = () => {}
    const landed = new Promise<void>((resolve) => {
      land = resolve
    })
    const close = vi.fn(() => landed)
    engineState.closeHandle = { close, isTransitioning: () => false }

    let settled = false
    const done = lightbox.close().then(() => {
      settled = true
    })

    expect(close).toHaveBeenCalledTimes(1)
    // The theme's await must track the real close, not resolve ahead of it —
    // an AJAX transition holds its page swap on this promise.
    await Promise.resolve()
    expect(settled).toBe(false)

    land()
    await done
    expect(settled).toBe(true)
  })

  it('close() resolves immediately when nothing is open, so a theme can call it blind', async () => {
    const lightbox = createLightbox()

    await expect(lightbox.close()).resolves.toBeUndefined()
  })

  it('close() cuts the sound before the choreography starts', async () => {
    const lightbox = createLightbox()
    const mute = vi.fn()
    audioFocus.claim({}, mute)

    await lightbox.close()

    expect(mute).toHaveBeenCalledTimes(1)
  })

  it('init() attaches delegation and prefetch listeners only once', () => {
    const lightbox = createLightbox()
    const addSpy = vi.spyOn(document, 'addEventListener')
    const relevant = () =>
      addSpy.mock.calls.filter((call) => ['click', 'keydown', 'pointerover'].includes(call[0]))
        .length

    lightbox.init()
    const afterFirst = relevant()
    expect(afterFirst).toBeGreaterThan(0)

    lightbox.init()
    expect(relevant()).toBe(afterFirst)

    lightbox.destroy()
  })

  it('destroy() removes the delegation and prefetch listeners added by init()', () => {
    const lightbox = createLightbox()
    lightbox.init()
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    lightbox.destroy()

    const removedNames = removeSpy.mock.calls.map((call) => call[0])
    expect(removedNames).toContain('click')
    expect(removedNames).toContain('keydown')
    expect(removedNames).toContain('pointerover')
  })

  it('destroy() calls engineState.pswp.destroy() when a core is open', () => {
    const lightbox = createLightbox()
    const destroy = vi.fn()
    engineState.pswp = { destroy } as unknown as PhotoSwipe

    lightbox.destroy()

    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('destroy() does not throw when nothing was ever opened or initialized', () => {
    const lightbox = createLightbox()
    expect(() => lightbox.destroy()).not.toThrow()
  })
})
