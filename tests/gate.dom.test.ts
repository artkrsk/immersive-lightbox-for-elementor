// @vitest-environment happy-dom

import type { IGateGlobal, ILightbox } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BOOT = {
  css: '/assets/lightbox.css',
  js: '/assets/lightbox.js',
  enabled: true
}

function makeLightbox(): ILightbox {
  return { init: () => {}, destroy: () => {}, open: vi.fn(() => true), version: 'test' }
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

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.className = ''
  Reflect.deleteProperty(window, 'artsLightbox')
  window.artsBetterLightboxBoot = { ...BOOT }
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
  it('installs the discovery global and the active html class', async () => {
    await importGate()
    expect(window.artsLightbox).toBeDefined()
    expect(window.artsLightbox?.get()).toBeNull()
    expect(document.documentElement.classList.contains('has-arts-lightbox')).toBe(true)
    expect(document.documentElement.classList.contains('no-arts-lightbox')).toBe(false)
  })

  it('marks inactive and loads nothing when disabled or bootless', async () => {
    window.artsBetterLightboxBoot = { ...BOOT, enabled: false }
    await importGate()
    expect(document.documentElement.classList.contains('no-arts-lightbox')).toBe(true)
    const a = addCandidate()
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(document.getElementById('better-lightbox-for-elementor-css')).toBeNull()
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
      'better-lightbox-for-elementor-css'
    ) as HTMLLinkElement | null
    expect(link?.getAttribute('href')).toBe(BOOT.css)

    link?.onload?.(new Event('load'))
    const script = document.getElementById('better-lightbox-for-elementor-js')
    expect(script?.getAttribute('src')).toBe(BOOT.js)

    const lightbox = makeLightbox()
    ;(window.artsLightbox as unknown as { __resolveReady(l: ILightbox): void }).__resolveReady(
      lightbox
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(lightbox.open).toHaveBeenCalledWith(a)
  })

  it('pre-warms assets on pointerover without holding anything', async () => {
    await importGate()
    const a = addCandidate()
    a.dispatchEvent(new Event('pointerover', { bubbles: true }))
    expect(document.getElementById('better-lightbox-for-elementor-css')).not.toBeNull()
    expect(document.getElementById('better-lightbox-for-elementor-js')).toBeNull()
  })

  it('releases a held click to native navigation when the engine fails to load', async () => {
    await importGate()
    const assign = vi.fn()
    vi.spyOn(window.location, 'assign').mockImplementation(assign)
    const a = addCandidate()
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const link = document.getElementById(
      'better-lightbox-for-elementor-css'
    ) as HTMLLinkElement | null
    link?.onload?.(new Event('load'))
    const script = document.getElementById('better-lightbox-for-elementor-js')
    ;(script as HTMLScriptElement | null)?.onerror?.(new Event('error'))
    expect(assign).toHaveBeenCalledWith('/full.jpg')
  })
})
