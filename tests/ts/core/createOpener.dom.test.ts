// @vitest-environment happy-dom

import { createOpener } from '@ts/core/createOpener'
import { engineState } from '@ts/core/engineState'
import { mergeOptions } from '@ts/core/mergeOptions'
import type { ILightboxApi, IOpenRequest, IOptions } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

afterEach(() => {
  engineState.pswp = null
  engineState.closeHandle = null
})

beforeEach(() => {
  document.body.innerHTML = ''
  // The scroll lock writes here and a test that opens without destroying
  // would otherwise hand its lock to the next one.
  document.documentElement.style.cssText = ''
  window.matchMedia = ((query: string) => ({
    matches: query === '(pointer: fine)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
})

/** A lightbox-able anchor the collector will pick up as a candidate. */
function candidate(): HTMLElement {
  const a = document.createElement('a')
  a.href = 'https://example.com/photo.jpg'
  a.setAttribute('data-arts-lightbox', '')
  const img = document.createElement('img')
  img.src = 'https://example.com/thumb.jpg'
  a.appendChild(img)
  document.body.appendChild(a)
  return a
}

/**
 * A stand-in for the real factory: same contract (stash the core, run the
 * caller's wiring), without booting a lightbox. It records the core so the
 * test can fire the fork's lifecycle events by hand.
 */
function stubFactory() {
  const core = fakePswp() as unknown as PhotoSwipe & {
    emit(name: string, e?: unknown): void
    element: HTMLElement | null
  }
  const root = document.createElement('div')
  root.className = 'pswp'
  document.body.appendChild(root)
  core.element = root
  core.options = { ...core.options } as PhotoSwipe['options']

  const make = vi.fn((_opts: IOptions, _req: IOpenRequest, configure?: (p: PhotoSwipe) => void) => {
    engineState.pswp = core
    configure?.(core as unknown as PhotoSwipe)
    return core as unknown as PhotoSwipe
  })
  return { make, core, root }
}

function opener(make: ReturnType<typeof stubFactory>['make'], close = vi.fn()) {
  const api = {
    close,
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn()
  } as unknown as ILightboxApi
  return createOpener({
    opts: mergeOptions() as IOptions,
    api,
    close,
    createPswp: make as unknown as NonNullable<Parameters<typeof createOpener>[0]['createPswp']>
  })
}

describe('createOpener', () => {
  it('boots the real factory when nothing overrides it', () => {
    // The seam must be a default, not a fork in behavior: production passes
    // no `createPswp`, so this is the path every real open takes.
    const real = createOpener({
      opts: mergeOptions() as IOptions,
      api: {
        close: vi.fn(),
        next: vi.fn(),
        prev: vi.fn(),
        goTo: vi.fn()
      } as unknown as ILightboxApi,
      close: vi.fn()
    })

    expect(real.open(candidate())).toBe(true)
    expect(engineState.pswp).not.toBeNull()
    expect(engineState.pswp?.isOpen).toBe(true)
    expect(engineState.closeHandle).not.toBeNull()
  })

  it('refuses a second open while a core is already live', () => {
    const { make } = stubFactory()
    const el = candidate()
    const o = opener(make)

    expect(o.open(el)).toBe(true)
    // engineState.pswp is set by the factory — the guard reads exactly that.
    expect(o.open(el)).toBe(false)
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('returns false for an element that resolves to no gallery', () => {
    const { make } = stubFactory()
    const stray = document.createElement('div')
    document.body.appendChild(stray)

    expect(opener(make).open(stray)).toBe(false)
    expect(make).not.toHaveBeenCalled()
  })

  it('hands the close handle to engineState so the api can reach it', () => {
    const { make } = stubFactory()

    opener(make).open(candidate())

    expect(engineState.closeHandle).not.toBeNull()
    expect(typeof engineState.closeHandle?.close).toBe('function')
  })

  it('routes a backdrop click through our choreography, not PhotoSwipe s close', () => {
    const { make, core } = stubFactory()
    const close = vi.fn()

    opener(make, close).open(candidate())
    // The option is a union of action names and callbacks; ours is a closure.
    const action = core.options.bgClickAction as unknown as () => void
    action()

    expect(close).toHaveBeenCalledTimes(1)
  })

  describe('on firstUpdate', () => {
    it('stamps the admin-bar offset and the smooth-scroll opt-out', () => {
      const { make, core, root } = stubFactory()
      opener(make).open(candidate())

      core.emit('firstUpdate')

      expect(root.getAttribute('data-lenis-prevent')).toBe('')
      expect(root.style.getPropertyValue('--arts-lightbox-admin-bar')).toBe('0px')
    })

    it('locks the page scroll, and destroy gives it back', () => {
      const { make, core } = stubFactory()
      opener(make).open(candidate())
      const before = document.documentElement.style.cssText

      core.emit('firstUpdate')
      expect(document.documentElement.style.cssText).not.toBe(before)

      core.emit('destroy')
      expect(document.documentElement.style.cssText).toBe(before)
    })

    it('re-stamps the admin bar on resize, since scroll is locked meanwhile', () => {
      const { make, core, root } = stubFactory()
      opener(make).open(candidate())
      core.emit('firstUpdate')
      root.style.removeProperty('--arts-lightbox-admin-bar')

      core.emit('resize')

      expect(root.style.getPropertyValue('--arts-lightbox-admin-bar')).toBe('0px')
    })
  })

  describe('header hold', () => {
    it('holds the site header down for the duration and releases on close', () => {
      const { make, core, root } = stubFactory()
      opener(make).open(candidate())

      core.emit('firstUpdate')
      // Arts Header for Elementor's own zone vocabulary, stamped declaratively.
      expect(root.getAttribute('data-arts-header-hide-over')).toBe('in-view')

      core.emit('close')

      expect(root.getAttribute('data-arts-header-hide-over')).toBeNull()
    })

    it('releases on destroy too, since a direct teardown never fires close', () => {
      const { make, core, root } = stubFactory()
      opener(make).open(candidate())
      core.emit('firstUpdate')

      core.emit('destroy')

      expect(root.getAttribute('data-arts-header-hide-over')).toBeNull()
    })
  })
})
