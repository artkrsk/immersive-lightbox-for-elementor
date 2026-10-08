// @vitest-environment happy-dom

import { VERSION } from '@ts/constants/version'
import { createLightboxApp } from '@ts/core/createLightboxApp'
import { getLightboxGlobal } from '@ts/core/lightboxGlobal'
import type { IGateGlobal } from '@ts/interfaces'
import type { ILightboxBootScript } from '@ts/interfaces/ILightboxBootScript'
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
})

describe('boot', () => {
  it('does not replace the current app when a queued observer replacement is cancelled', async () => {
    const current = createLightboxApp()
    current.init()
    const instance = current.get()
    const hub = getLightboxGlobal(window)
    const stop = hub.observeRoots((roots) => {
      if (!roots.length) {
        return
      }
      const next = createLightboxApp()
      next.init()
      next.destroy()
    })
    hub.__roots.set({
      root: document.createElement('div'),
      sourceElement: document.createElement('a'),
      index: 0,
      total: 1
    })
    await Promise.resolve()
    expect(current.get()).toBe(instance)
    expect(hub.get()).toBe(instance)
    stop()
  })

  it('constructs passively and declines a retired gate signal', () => {
    const lifetime = new AbortController()
    const app = createLightboxApp({ signal: lifetime.signal })
    expect(window.artsLightbox).toBeUndefined()
    lifetime.abort()
    app.init()
    expect(window.artsLightbox).toBeUndefined()
  })

  it('cancels initialization while waiting for DOM readiness', () => {
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    const app = createLightboxApp()
    app.init()
    app.destroy()
    document.dispatchEvent(new Event('DOMContentLoaded'))
    expect(app.get()).toBeNull()
    expect(window.artsLightbox?.get()).toBeNull()
    readyState.mockRestore()
  })

  it('owns an initialized app through the original gate signal', () => {
    const lifetime = new AbortController()
    const app = createLightboxApp({ signal: lifetime.signal })
    app.init()
    const first = app.get()
    app.init()
    expect(app.get()).toBe(first)
    lifetime.abort()
    expect(app.get()).toBeNull()
    expect(window.artsLightbox?.get()).toBeNull()
    app.init()
    expect(app.get()).toBeNull()
  })

  it('does not run a classic bootstrap downloaded by a retired gate', async () => {
    const lifetime = new AbortController()
    const script = document.createElement('script') as ILightboxBootScript
    script.__artsLightboxSignal = lifetime.signal
    const currentScript = vi.spyOn(document, 'currentScript', 'get').mockReturnValue(script)
    lifetime.abort()
    await importBoot()
    expect(window.artsLightbox).toBeUndefined()
    currentScript.mockRestore()
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
    expect(window.artsLightbox?.version).toBe(VERSION)
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
