// @vitest-environment happy-dom

import type { ElementorFrontend } from '@artemsemkin/elementor-types'
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

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.className = ''
  Reflect.deleteProperty(window, 'artsLightbox')
  Reflect.deleteProperty(window, 'artsCursor')
  Reflect.deleteProperty(window, 'elementorFrontend')
  window.artsImmersiveLightboxBoot = { ...BOOT }
})

afterEach(async () => {
  // Each import() eval arms its own document listeners; the gate's designed
  // teardown is `ready.then(disarm)` — resolve it so evals never leak into
  // the next test. Double-resolves are no-ops.
  ;(window.artsLightbox as IGateGlobal | undefined)?.__resolveReady?.(makeLightbox())
  await Promise.resolve()
  await Promise.resolve()
  vi.restoreAllMocks()
})

describe('gate', () => {
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
    ;(window.artsLightbox as unknown as { __resolveReady(l: ILightbox): void }).__resolveReady(
      lightbox
    )
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
