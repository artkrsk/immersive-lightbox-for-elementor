// @vitest-environment happy-dom

import type { IGateGlobal, ILightbox } from '@ts/interfaces'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  it('claims the gate resolver so pre-held ready promises resolve', async () => {
    let resolved: ILightbox | null = null
    let resolveReady!: (l: ILightbox) => void
    const ready = new Promise<ILightbox>((resolve) => {
      resolveReady = resolve
    })
    void ready.then((l) => {
      resolved = l
    })
    const gate: IGateGlobal = {
      ready,
      get: () => null,
      version: 'gate',
      refresh: () => {},
      __resolveReady: (l) => resolveReady(l)
    }
    window.artsLightbox = gate

    await importBoot()
    await ready
    expect(resolved).not.toBeNull()
    expect(window.artsLightbox?.get()).toBe(resolved)
    expect(window.artsLightbox?.version).toBe('0.0.0-test')
    // the boot global is the clean consumer shape, not the gate shape
    expect((window.artsLightbox as Partial<IGateGlobal>).__resolveReady).toBeUndefined()
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
})
