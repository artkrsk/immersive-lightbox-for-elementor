// @vitest-environment happy-dom

import { getLightboxGlobal } from '@ts/core/lightboxGlobal'
import type { IGateGlobal } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function importBoot(): Promise<void> {
  vi.resetModules()
  await import('@ts/boot')
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'artsLightbox')
  Reflect.deleteProperty(window, 'artsImmersiveLightboxOptions')
  Reflect.deleteProperty(window, 'artsImmersiveLightboxBoot')
})

describe('boot', () => {
  it('drops candidate marks while WooCommerce owns an AJAX page', async () => {
    document.body.innerHTML = '<a href="/photo.jpg" data-arts-lightbox></a>'
    await importBoot()
    const a = document.querySelector('a') as HTMLAnchorElement
    window.artsLightbox?.refresh()
    expect(a.classList.contains('arts-lightbox-link')).toBe(true)

    window.artsImmersiveLightboxBoot = { css: '', js: '', enabled: false }
    window.artsLightbox?.refresh()
    expect(a.classList.contains('arts-lightbox-link')).toBe(false)
    window.artsImmersiveLightboxBoot.enabled = true
    window.artsLightbox?.refresh()
    expect(a.classList.contains('arts-lightbox-link')).toBe(true)
  })

  it('preserves the gate namespace, ready promise and observer registry', async () => {
    const gate = getLightboxGlobal(window)
    const ready = gate.ready
    const seen = vi.fn()
    gate.observeRoots(seen)

    await importBoot()
    const resolved = await ready
    expect(resolved).not.toBeNull()
    expect(window.artsLightbox?.get()).toBe(resolved)
    expect(window.artsLightbox?.version).toBe('0.0.0-test')
    expect(window.artsLightbox).toBe(gate)
    expect(window.artsLightbox?.ready).toBe(ready)
    gate.__roots.set({
      root: document.createElement('div'),
      sourceElement: document.createElement('a'),
      index: 2,
      total: 3
    })
    expect(seen).toHaveBeenCalledTimes(2)
  })

  it('self-creates the global and announces readiness without a gate', async () => {
    const announced = vi.fn()
    document.addEventListener('arts-lightbox:ready', announced, { once: true })
    await importBoot()
    expect(window.artsLightbox).toBeDefined()
    await window.artsLightbox?.ready
    expect(window.artsLightbox?.get()).not.toBeNull()
    expect(announced).toHaveBeenCalledTimes(1)
  })

  it('keeps the hub on replacement and ignores an outgoing boot disposer', async () => {
    await importBoot()
    const hub = getLightboxGlobal(window)
    const first = hub.get()
    const dispose = hub.__disposeBoot
    if (!dispose) throw new Error('Expected a boot owner')
    await importBoot()
    const next = hub.get()
    expect(next).not.toBe(first)
    dispose()
    expect(hub.get()).toBe(next)
    expect(window.artsLightbox).toBe(hub)
    next?.destroy()
    expect(hub.get()).toBeNull()
    next?.init()
    expect(hub.get()).toBe(next)
  })
})

afterEach(() => {
  ;(window.artsLightbox as IGateGlobal | undefined)?.__disposeBoot?.()
})
