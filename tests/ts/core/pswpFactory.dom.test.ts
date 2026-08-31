// @vitest-environment happy-dom

import { engineState } from '@ts/core/engineState'
import { mergeOptions } from '@ts/core/mergeOptions'
import { createPswp } from '@ts/core/pswpFactory'
import type { IGallery, IOpenRequest, IOptions, ISlideData } from '@ts/interfaces'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The real fork, booted for real. It is repo source with no npm dependency
 * and `init()` only needs a document to append to, so there is nothing to
 * fake here — and faking it would test the fake, not the factory.
 */

afterEach(() => {
  engineState.pswp?.destroy()
  engineState.pswp = null
  engineState.closeHandle = null
  document.body.innerHTML = ''
})

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: query === '(pointer: fine)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
})

function request(): IOpenRequest {
  const slides: ISlideData[] = [
    { key: 'a', type: 'image', src: '/a.jpg', width: 1600, height: 1200 },
    { key: 'b', type: 'image', src: '/b.jpg', width: 1600, height: 1200 }
  ]
  const sourceElement = document.createElement('a')
  document.body.appendChild(sourceElement)
  const gallery: IGallery = {
    id: 'g',
    slides,
    elementsByKey: new Map([['a', [sourceElement]]])
  }
  return { gallery, index: 0, sourceElement }
}

function options(over: Parameters<typeof mergeOptions>[0] = {}): IOptions {
  return mergeOptions(over) as IOptions
}

describe('createPswp', () => {
  it('publishes the core on engineState before configure runs', () => {
    let seen: unknown = 'not called'
    const pswp = createPswp(options(), request(), () => {
      seen = engineState.pswp
    })

    // configure attaches the transition handle, which reads this back.
    expect(seen).toBe(pswp)
  })

  it('runs configure before init, so wiring never misses a lifecycle event', () => {
    const order: string[] = []
    const pswp = createPswp(options(), request(), (p) => {
      order.push('configure')
      p.on('afterInit', () => order.push('afterInit'))
    })

    expect(order).toEqual(['configure', 'afterInit'])
    expect(pswp.isOpen).toBe(true)
  })

  it('opens without a configure callback', () => {
    expect(() => createPswp(options(), request())).not.toThrow()
  })

  it('re-enables desktop drag that the Gestures constructor turned off', () => {
    const pswp = createPswp(options({ desktopDrag: true }), request())

    // Gestures force-disables this for non-touch; the consumer reads it live.
    expect(pswp.options.allowPanToNext).toBe(true)
  })

  it('leaves the option alone when desktop drag is off', () => {
    const pswp = createPswp(options({ desktopDrag: false }), request())

    expect(pswp.options.allowPanToNext).not.toBe(true)
  })

  // `destroy()` on a live core routes through `close()` first and only
  // dispatches on the second pass, so every assertion below waits it out.
  it('clears engineState when its own core is destroyed', async () => {
    const pswp = createPswp(options(), request())
    engineState.closeHandle = { close: vi.fn(), isTransitioning: () => false }

    pswp.destroy()

    await vi.waitFor(() => {
      expect(engineState.pswp).toBeNull()
    })
    expect(engineState.closeHandle).toBeNull()
  })

  it('does not clear a newer core when a stale one is destroyed', async () => {
    const first = createPswp(options(), request())
    const second = createPswp(options(), request())
    const destroyed = new Promise<void>((resolve) => {
      first.on('destroy', () => resolve())
    })

    // The identity guard is what keeps an overlapping close from stranding
    // the session that replaced it.
    first.destroy()
    await destroyed

    expect(engineState.pswp).toBe(second)
  })
})
