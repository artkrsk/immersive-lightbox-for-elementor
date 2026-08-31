// @vitest-environment happy-dom

import { createNavigator } from '@ts/core/createNavigator'
import { engineState } from '@ts/core/engineState'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, describe, expect, it, vi } from 'vitest'

function setup(opts: { index: number; total: number; loop?: boolean }) {
  const { index, total, loop = false } = opts
  const pswp = {
    currIndex: index,
    potentialIndex: index,
    options: { loop },
    getNumItems: () => total,
    // The rule under test, verbatim from the fork.
    canLoop: () => loop && total > 2,
    mainScroll: { moveIndexBy: vi.fn() }
  }
  engineState.pswp = pswp as unknown as PhotoSwipe
  return { navigator: createNavigator(), pswp }
}

afterEach(() => {
  engineState.pswp = null
})

describe('createNavigator', () => {
  it('moves through the main scroll spring, not pswp.next()', () => {
    const { navigator, pswp } = setup({ index: 1, total: 5 })
    navigator.nav(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
    navigator.nav(-1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(-1, true)
  })

  it('goTo moves relative to the current index', () => {
    const { navigator, pswp } = setup({ index: 3, total: 5 })
    navigator.goTo(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(-2, true)
  })

  it('leaves the wrap to PhotoSwipe once a real loop is possible', () => {
    const { navigator, pswp } = setup({ index: 2, total: 3, loop: true })
    navigator.nav(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
  })

  it('wraps a two-slide gallery back to the other end', () => {
    const last = setup({ index: 1, total: 2, loop: true })
    last.navigator.nav(1)
    expect(last.pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(-1, true)

    const first = setup({ index: 0, total: 2, loop: true })
    first.navigator.nav(-1)
    expect(first.pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
  })

  it('keeps the hard end when loop is off', () => {
    const { navigator, pswp } = setup({ index: 1, total: 2 })
    navigator.nav(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
  })

  it('has nowhere to wrap with a single slide', () => {
    const { navigator, pswp } = setup({ index: 0, total: 1, loop: true })
    navigator.nav(1)
    expect(pswp.mainScroll.moveIndexBy).toHaveBeenCalledWith(1, true)
  })

  it('is inert with no open core', () => {
    engineState.pswp = null
    const navigator = createNavigator()
    expect(() => {
      navigator.nav(1)
      navigator.goTo(2)
    }).not.toThrow()
  })
})
