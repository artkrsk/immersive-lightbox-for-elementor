// @vitest-environment happy-dom

import { DEFAULT_OPTIONS } from '@ts/constants'
import { createNavigator } from '@ts/core/createNavigator'
import { engineState } from '@ts/core/engineState'
import type { IGallery, IOpenRequest, IOptions } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, describe, expect, it, vi } from 'vitest'

function gallery(id: string, keys: string[]): IGallery {
  const g: IGallery = { id, slides: [], elementsByKey: new Map() }
  for (const key of keys) {
    g.slides.push({ key, type: 'image', src: `/${key}.jpg` })
    g.elementsByKey.set(key, [document.createElement('a')])
  }
  return g
}

function setup(passThrough: boolean, currIndex: number) {
  const gA = gallery('a', ['a1', 'a2'])
  const gB = gallery('b', ['b1', 'b2', 'b3'])
  const galleries = [gA, gB]
  const req: IOpenRequest = {
    gallery: gA,
    index: 0,
    sourceElement: gA.elementsByKey.get('a1')?.[0] as HTMLElement
  }
  const pswp = {
    currIndex,
    destroy: vi.fn(),
    mainScroll: { moveIndexBy: vi.fn() }
  }
  engineState.pswp = pswp as unknown as PhotoSwipe
  const openInstant = vi.fn()
  const opts: IOptions = {
    ...DEFAULT_OPTIONS,
    gallery: { ...DEFAULT_OPTIONS.gallery, passThrough }
  }
  const navigator = createNavigator({ opts, getCurrent: () => ({ req, galleries }), openInstant })
  return { navigator, pswp, openInstant, gB }
}

afterEach(() => {
  engineState.pswp = null
})

describe('createNavigator', () => {
  it('moves within the gallery through the main scroll spring', () => {
    const { navigator, pswp, openInstant } = setup(true, 0)
    navigator.nav(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
    expect(openInstant).not.toHaveBeenCalled()
  })

  it('passes through to the neighbor gallery at the boundary', () => {
    const { navigator, pswp, openInstant, gB } = setup(true, 1) // last slide of gallery a
    navigator.nav(1)
    expect(pswp.destroy).toHaveBeenCalled()
    const [req, galleries] = openInstant.mock.calls[0] as [IOpenRequest, IGallery[]]
    expect(req.gallery).toBe(gB)
    expect(req.index).toBe(0)
    expect(galleries.length).toBe(2)
  })

  it('enters a previous gallery at its LAST slide', () => {
    const { navigator, openInstant } = setup(true, 0)
    // gallery a is first — nav(-1) has no previous neighbor, stays put
    navigator.nav(-1)
    expect(openInstant).not.toHaveBeenCalled()
  })

  it('stays inside the gallery when passThrough is off', () => {
    const { navigator, pswp, openInstant } = setup(false, 1)
    navigator.nav(1)
    expect(openInstant).not.toHaveBeenCalled()
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
  })

  it('goTo moves relative to the current index', () => {
    const { navigator, pswp } = setup(true, 0)
    navigator.goTo(2)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(2, true)
  })
})
