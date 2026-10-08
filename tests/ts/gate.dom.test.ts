// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}

import type { ElementorFrontend } from '@artemsemkin/elementor-types'
import { PRELOAD_TIMEOUT_MS } from '@ts/constants/preload'
import { createLightboxApp } from '@ts/core/createLightboxApp'
import { createLightboxGate } from '@ts/gate/createLightboxGate'
import type { IGateGlobal, ILightbox } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BOOT = {
  css: '/assets/lightbox.css',
  js: '/assets/lightbox.js',
  enabled: true
}

function makeLightbox(): ILightbox {
  return {
    init: () => {},
    destroy: () => {},
    close: () => Promise.resolve(),
    open: vi.fn(() => true),
    version: 'test'
  }
}

async function importGate(): Promise<void> {
  vi.resetModules()
  await import('@ts/gate')
}

function addCandidate(): HTMLAnchorElement {
  const a = document.createElement('a')
  a.setAttribute('href', '/full.jpg')
  a.setAttribute('data-arts-lightbox', '')
  document.body.appendChild(a)
  return a
}

/** The gate coalesces its Elementor re-marks into one animation frame. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

const resourceError = (event: Event): void => {
  event.preventDefault()
  event.stopImmediatePropagation()
}

beforeEach(() => {
  /** Resource outcomes are delivered explicitly by these tests. */
  document.addEventListener('error', resourceError, { capture: true })
  document.addEventListener('load', resourceError, { capture: true })
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.className = ''
  Reflect.deleteProperty(window, 'artsLightbox')
  Reflect.deleteProperty(window, 'artsCursor')
  Reflect.deleteProperty(window, 'jQuery')
  Reflect.deleteProperty(window, 'elementorFrontend')
  window.artsImmersiveLightboxBoot = { ...BOOT }
  // Keep the default test path from leaving a two-second fallback timer
  // behind when a fixture has a candidate before the gate evaluates.
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn(() => 1)
  )
})

afterEach(async () => {
  ;(window.artsLightbox as IGateGlobal | undefined)?.__disposeGate?.()
  ;(window.artsLightbox as IGateGlobal | undefined)?.__disposeBoot?.()
  document.removeEventListener('error', resourceError, true)
  document.removeEventListener('load', resourceError, true)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('gate', () => {
  it('releases a failed stylesheet click and leaves later clicks to native navigation', () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const gate = createLightboxGate(BOOT)
    gate.init()
    const anchor = addCandidate()
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const link = document.getElementById('immersive-lightbox-for-elementor-css') as HTMLLinkElement
    link.onerror?.(new Event('error'))
    expect(assign).toHaveBeenCalledWith('/full.jpg')
    const nextClick = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor.dispatchEvent(nextClick)
    expect(nextClick.defaultPrevented).toBe(false)
  })

  it('releases a held click when the module bootstrap rejects', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const gate = createLightboxGate({
      enabled: true,
      css: BOOT.css,
      load: async () => {
        throw new Error('unavailable module')
      }
    })
    gate.init()
    const anchor = addCandidate()
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const link = document.getElementById('immersive-lightbox-for-elementor-css') as HTMLLinkElement
    link.onload?.(new Event('load'))
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith('/full.jpg')
    })
  })

  it('cancels an idle warm and makes a captured late callback inert', () => {
    let queued: IdleRequestCallback | undefined
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: IdleRequestCallback) => {
        queued = callback
        return 7
      })
    )
    const cancelIdle = vi.fn()
    vi.stubGlobal('cancelIdleCallback', cancelIdle)
    addCandidate()
    const gate = createLightboxGate(BOOT)
    expect(window.artsLightbox).toBeUndefined()
    gate.init()
    gate.destroy()
    queued?.({ didTimeout: false, timeRemaining: () => 50 })
    expect(cancelIdle).toHaveBeenCalledWith(7)
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).toBeNull()
  })

  it('cancels a pending stylesheet and held click without navigating or replaying', async () => {
    const gate = createLightboxGate(BOOT)
    gate.init()
    const anchor = addCandidate()
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const link = document.getElementById('immersive-lightbox-for-elementor-css') as HTMLLinkElement
    const loaded = link.onload
    const error = link.onerror
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    gate.destroy()
    loaded?.call(link, new Event('load'))
    error?.call(link, new Event('error'))
    const lightbox = makeLightbox()
    ;(window.artsLightbox as IGateGlobal).__setInstance(lightbox)
    document.dispatchEvent(new CustomEvent('arts-lightbox:ready', { detail: lightbox }))
    await Promise.resolve()
    expect(lightbox.open).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    expect(document.getElementById('immersive-lightbox-for-elementor-js')).toBeNull()
  })

  it('passes the original lifetime into a delayed module import', async () => {
    let resume: (() => void) | undefined
    const load = vi.fn(async (signal: AbortSignal) => {
      await new Promise<void>((resolve) => {
        resume = resolve
      })
      createLightboxApp({ signal }).init()
    })
    const gate = createLightboxGate({ enabled: true, editor: true, css: BOOT.css, load })
    gate.init()
    const link = document.getElementById('immersive-lightbox-for-elementor-css') as HTMLLinkElement
    link.onload?.(new Event('load'))
    await Promise.resolve()
    expect(load).toHaveBeenCalledWith(gate.signal)
    const hub = window.artsLightbox
    gate.destroy()
    const replacement = createLightboxApp()
    replacement.init()
    const current = replacement.get()
    resume?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(window.artsLightbox).toBe(hub)
    expect(window.artsLightbox?.get()).toBe(current)
  })

  it('removes WordPress refresh subscriptions and pending frames on disposal', async () => {
    const addAction = vi.fn()
    const removeAction = vi.fn()
    const off = vi.fn()
    window.elementorFrontend = {
      hooks: { addAction, removeAction }
    } as unknown as ElementorFrontend
    window.jQuery = () => ({ on: vi.fn(), off })
    await importGate()
    const callback = addAction.mock.calls[0]?.[1] as () => void
    callback()
    ;(window.artsLightbox as IGateGlobal).__disposeGate?.()
    expect(removeAction).toHaveBeenCalledWith('frontend/element_ready/global', callback)
    expect(off).toHaveBeenCalledWith(
      'wc-product-gallery-after-init.artsLightbox',
      '.woocommerce-product-gallery',
      callback
    )
    const anchor = addCandidate()
    await nextFrame()
    expect(anchor.classList.contains('arts-lightbox-link')).toBe(false)
  })

  it('re-marks a replaced WooCommerce variation gallery', async () => {
    const handlers: Array<() => void> = []
    window.jQuery = () => ({
      on: (_events, _selector, handler) => {
        handlers.push(handler)
      }
    })
    await importGate()
    if (handlers.length === 0) {
      document.dispatchEvent(new Event('DOMContentLoaded'))
    }
    expect(handlers).toHaveLength(1)

    document.body.innerHTML = `
      <div class="woocommerce-product-gallery arts-lightbox-wc-gallery">
        <div class="woocommerce-product-gallery__image"><a href="/variation.jpg"><img></a></div>
      </div>
    `
    const link = document.querySelector('a') as HTMLAnchorElement
    expect(link.classList.contains('arts-lightbox-link')).toBe(false)
    handlers[0]?.()
    await nextFrame()
    expect(link.classList.contains('arts-lightbox-link')).toBe(true)
  })

  it('stamps candidates at boot and re-marks through refresh()', async () => {
    const a = addCandidate()
    const cursorRefresh = vi.fn()
    window.artsCursor = { get: () => ({ refresh: cursorRefresh }) }
    await importGate()
    expect(a.classList.contains('arts-lightbox-link')).toBe(true)
    a.removeAttribute('data-arts-lightbox')
    window.artsLightbox?.refresh()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
    expect(cursorRefresh).toHaveBeenCalled()
  })

  it('re-marks on the AJAX-transition re-emitted DOMContentLoaded', async () => {
    await importGate()
    // Arts AJAX themes re-dispatch DOMContentLoaded after every transition,
    // with the swapped barba container in detail. New DOM, same page.
    const a = addCandidate()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
    document.dispatchEvent(
      new CustomEvent('DOMContentLoaded', { bubbles: true, detail: { container: a } })
    )
    expect(a.classList.contains('arts-lightbox-link')).toBe(true)
  })

  it('re-marks on Elementor element renders, coalesced to one frame', async () => {
    const hooks: Record<string, () => void> = {}
    window.elementorFrontend = {
      hooks: {
        addAction: (name: string, handler: () => void) => {
          hooks[name] = handler
        }
      }
    } as unknown as ElementorFrontend
    await importGate()
    // Elementor's init has already run by the time a replayed gate evaluates,
    // so the registry is read directly rather than waited for.
    const remark = hooks['frontend/element_ready/global']
    expect(remark).toBeTypeOf('function')

    const a = addCandidate()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)

    const refresh = vi.spyOn(window.artsLightbox as IGateGlobal, 'refresh')
    // One render per widget on a page's worth of them; one rescan for the lot.
    remark?.()
    remark?.()
    remark?.()
    await nextFrame()

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(a.classList.contains('arts-lightbox-link')).toBe(true)
  })

  it('waits for Elementor init when the registry is not up yet', async () => {
    await importGate()
    const hooks: Record<string, () => void> = {}
    window.elementorFrontend = {
      hooks: {
        addAction: (name: string, handler: () => void) => {
          hooks[name] = handler
        }
      }
    } as unknown as ElementorFrontend
    window.dispatchEvent(new CustomEvent('elementor/frontend/init'))
    const remark = hooks['frontend/element_ready/global']
    expect(remark).toBeTypeOf('function')

    const a = addCandidate()
    remark?.()
    await nextFrame()

    expect(a.classList.contains('arts-lightbox-link')).toBe(true)
  })

  it('ignores the re-emitted DOMContentLoaded while disabled', async () => {
    window.artsImmersiveLightboxBoot = { ...BOOT, enabled: false }
    await importGate()
    const a = addCandidate()
    document.dispatchEvent(
      new CustomEvent('DOMContentLoaded', { bubbles: true, detail: { container: a } })
    )
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
  })

  it('stamps nothing while disabled, and refresh() stays a safe no-op', async () => {
    window.artsImmersiveLightboxBoot = { ...BOOT, enabled: false }
    const a = addCandidate()
    await importGate()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
    expect(() => window.artsLightbox?.refresh()).not.toThrow()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
  })

  it('installs the discovery global and the active html class', async () => {
    await importGate()
    expect(window.artsLightbox).toBeDefined()
    expect(window.artsLightbox?.get()).toBeNull()
    expect(document.documentElement.classList.contains('has-arts-lightbox')).toBe(true)
    expect(document.documentElement.classList.contains('no-arts-lightbox')).toBe(false)
  })

  it('marks inactive and loads nothing when disabled or bootless', async () => {
    window.artsImmersiveLightboxBoot = { ...BOOT, enabled: false }
    await importGate()
    expect(document.documentElement.classList.contains('no-arts-lightbox')).toBe(true)
    const a = addCandidate()
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).toBeNull()
  })

  it('does not clobber a live global on re-eval', async () => {
    await importGate()
    const first = window.artsLightbox
    await importGate()
    expect(window.artsLightbox).toBe(first)
  })

  it('holds a candidate click, injects assets, and replays the open when ready', async () => {
    await importGate()
    const a = addCandidate()
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    a.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)

    const link = document.getElementById(
      'immersive-lightbox-for-elementor-css'
    ) as HTMLLinkElement | null
    expect(link?.getAttribute('href')).toBe(BOOT.css)

    link?.onload?.(new Event('load'))
    const script = document.getElementById('immersive-lightbox-for-elementor-js')
    expect(script?.getAttribute('src')).toBe(BOOT.js)

    const lightbox = makeLightbox()
    ;(window.artsLightbox as IGateGlobal).__setInstance(lightbox)
    document.dispatchEvent(new CustomEvent('arts-lightbox:ready', { detail: lightbox }))
    await Promise.resolve()
    await Promise.resolve()
    // the held click's viewport point rides along to seed the initial pan
    expect(lightbox.open).toHaveBeenCalledWith(a, { x: 0, y: 0 })
  })

  it('swallows a drag-ending click without holding or loading', async () => {
    await importGate()
    const a = addCandidate()
    const pointer = (type: string, x: number): void => {
      a.dispatchEvent(
        new PointerEvent(type, { bubbles: true, isPrimary: true, clientX: x, clientY: 10 })
      )
    }
    pointer('pointerdown', 10)
    pointer('pointermove', 150)
    pointer('pointerup', 150)
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 150,
      clientY: 10
    })
    a.dispatchEvent(event)

    // Swallowed, not held: the accidental click neither navigates nor
    // queues a replayed open behind the asset load.
    expect(event.defaultPrevented).toBe(true)
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).toBeNull()
  })

  it('pre-warms assets on pointerover without holding anything', async () => {
    await importGate()
    const a = addCandidate()
    a.dispatchEvent(new Event('pointerover', { bubbles: true }))
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).not.toBeNull()
    expect(document.getElementById('immersive-lightbox-for-elementor-js')).toBeNull()
  })

  it('warms a candidate page once through idle time', async () => {
    let queued: IdleRequestCallback | undefined
    const idle = vi.fn((callback: IdleRequestCallback) => {
      queued = callback
      return 1
    })
    vi.stubGlobal('requestIdleCallback', idle)
    addCandidate()

    await importGate()

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: PRELOAD_TIMEOUT_MS })
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).toBeNull()

    queued?.({ didTimeout: false, timeRemaining: () => 50 })
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).not.toBeNull()

    window.artsLightbox?.refresh()
    expect(idle).toHaveBeenCalledTimes(1)
  })

  it('does not schedule an idle warm when the page has no candidates', async () => {
    const idle = vi.fn(() => 1)
    vi.stubGlobal('requestIdleCallback', idle)

    await importGate()

    expect(idle).not.toHaveBeenCalled()
  })

  it('falls back to the preload timeout when idle callbacks are unavailable', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    let queued: (() => void) | undefined
    const timeout = vi.fn((callback: TimerHandler, _delay?: number) => {
      if (typeof callback !== 'function') {
        throw new Error('The preload fallback must schedule a callback')
      }
      queued = () => callback()
      return 1
    })
    vi.stubGlobal('setTimeout', timeout)
    addCandidate()

    await importGate()

    expect(timeout).toHaveBeenCalledWith(expect.any(Function), PRELOAD_TIMEOUT_MS)
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).toBeNull()

    queued?.()
    expect(document.getElementById('immersive-lightbox-for-elementor-css')).not.toBeNull()
  })

  it('releases a held click to native navigation when the engine fails to load', async () => {
    await importGate()
    const assign = vi.fn()
    vi.spyOn(window.location, 'assign').mockImplementation(assign)
    const a = addCandidate()
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const link = document.getElementById(
      'immersive-lightbox-for-elementor-css'
    ) as HTMLLinkElement | null
    link?.onload?.(new Event('load'))
    const script = document.getElementById('immersive-lightbox-for-elementor-js')
    ;(script as HTMLScriptElement | null)?.onerror?.(new Event('error'))
    expect(assign).toHaveBeenCalledWith('/full.jpg')
  })
})
