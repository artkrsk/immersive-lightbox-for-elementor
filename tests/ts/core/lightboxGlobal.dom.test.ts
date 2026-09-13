// @vitest-environment happy-dom

import { getLightboxGlobal } from '@ts/core/lightboxGlobal'
import type { ILightboxRoot } from '@ts/interfaces'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  delete window.artsLightbox
  vi.restoreAllMocks()
})

const root = (): ILightboxRoot => ({
  root: document.createElement('div'),
  sourceElement: document.createElement('a'),
  index: 0,
  total: 3
})

describe('root observation', () => {
  it('replays empty state without loading, then immutable snapshots with the original source', () => {
    const hub = getLightboxGlobal(window)
    const load = vi.fn()
    hub.preload = load
    const seen = vi.fn()
    hub.observeRoots(seen)
    const value = root()
    hub.__roots.set(value)
    const first = seen.mock.lastCall?.[0]
    hub.__roots.set({ ...value, index: 2, sourceElement: document.createElement('a') })
    hub.__roots.set({ ...value, index: 2 })
    expect(first).toEqual([value])
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first[0])).toBe(true)
    expect(seen.mock.calls).toEqual([[[]], [[value]], [[{ ...value, index: 2 }]]])
    expect(load).not.toHaveBeenCalled()
    expect(hub.get()).toBeNull()
    const late = vi.fn()
    hub.observeRoots(late)
    expect(late).toHaveBeenCalledWith([{ ...value, index: 2 }])
  })

  it('removes only the matching root and ignores stale removals', () => {
    const hub = getLightboxGlobal(window)
    const first = root()
    const second = root()
    hub.__roots.set(first)
    hub.__roots.set(second)
    const seen = vi.fn()
    hub.observeRoots(seen)
    hub.__roots.delete(first.root)
    hub.__roots.delete(first.root)
    expect(seen.mock.calls).toEqual([[[first, second]], [[second]]])
  })

  it('handles pre-abort, abort during replay and idempotent unsubscribe', () => {
    const hub = getLightboxGlobal(window)
    const owner = new AbortController()
    const seen = vi.fn(() => owner.abort())
    const stop = hub.observeRoots(seen, { signal: owner.signal })
    stop()
    stop()
    hub.observeRoots(seen, { signal: owner.signal })()
    hub.__roots.set(root())
    expect(seen).toHaveBeenCalledOnce()
  })

  it('does not deliver stale state after reentrant removal, and isolates errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const hub = getLightboxGlobal(window)
    hub.observeRoots(() => {
      throw new Error('consumer')
    })
    hub.observeRoots((values) => {
      if (values[0]) hub.__roots.delete(values[0].root)
    })
    const seen = vi.fn()
    hub.observeRoots(seen)
    expect(() => hub.__roots.set(root())).not.toThrow()
    expect(seen.mock.calls).toEqual([[[]], [[]]])
  })
})
