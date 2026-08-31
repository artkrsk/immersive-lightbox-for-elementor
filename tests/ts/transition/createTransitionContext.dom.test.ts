// @vitest-environment happy-dom

import { mergeOptions } from '@ts/core/mergeOptions'
import type { IFlightFrame, IGallery, IOpenRequest } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { createTransitionContext } from '@ts/transition/createTransitionContext'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const FRAME: IFlightFrame = {
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  radius: 0,
  innerHeightPct: 100,
  innerOffsetYPct: 0
}

const DEFAULT_OPEN_SOURCE = {
  rect: { x: 0, y: 0, w: 0, h: 0 },
  radius: 0,
  innerHeightPct: 100,
  innerOffsetYPct: 0,
  src: ''
}

function request(type: 'image' | 'html'): { req: IOpenRequest; a: HTMLElement } {
  document.body.innerHTML = '<a id="a" href="/a.jpg"><img src="/thumb.jpg" alt="" /></a>'
  const a = document.querySelector('#a') as HTMLElement
  const gallery: IGallery = {
    id: 'g',
    slides: [{ key: 'a', type, src: '/a.jpg' }],
    elementsByKey: new Map([['a', [a]]])
  }
  return { req: { gallery, index: 0, sourceElement: a }, a }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('createTransitionContext', () => {
  it('captures the real click-time source for an image slide', () => {
    const pswp = fakePswp()
    const { req } = request('image')
    const ctx = createTransitionContext(pswp as unknown as PhotoSwipe, mergeOptions(), req)

    expect(ctx.openSource).not.toEqual(DEFAULT_OPEN_SOURCE)
    expect(ctx.openSource.src).toContain('/thumb.jpg')
  })

  it('falls back to the neutral default openSource for a non-image/video slide', () => {
    const pswp = fakePswp()
    const { req } = request('html')
    const ctx = createTransitionContext(pswp as unknown as PhotoSwipe, mergeOptions(), req)

    expect(ctx.openSource).toEqual(DEFAULT_OPEN_SOURCE)
  })

  it('starts backdrop empty and wires up flight and hidden trackers', () => {
    const pswp = fakePswp()
    const { req } = request('html')
    const ctx = createTransitionContext(pswp as unknown as PhotoSwipe, mergeOptions(), req)

    expect(ctx.backdrop).toEqual({ current: null })
    expect(ctx.flight).toBeDefined()
    expect(ctx.hidden).toBeDefined()
    expect(ctx.pswp).toBe(pswp)
    expect(ctx.req).toBe(req)
  })

  it('resolves the flight root to pswp.element when set, else falls back to document.body', () => {
    const pswp = fakePswp()
    const { req } = request('html')
    const ctx = createTransitionContext(pswp as unknown as PhotoSwipe, mergeOptions(), req)

    ctx.flight.mount(FRAME, { src: '/a.jpg' })
    expect(document.body.querySelector('.arts-lightbox-flight')).not.toBeNull()
    ctx.flight.unmount()

    const root = document.createElement('div')
    document.body.appendChild(root)
    pswp.element = root
    ctx.flight.mount(FRAME, { src: '/a.jpg' })
    expect(root.querySelector('.arts-lightbox-flight')).not.toBeNull()
    ctx.flight.unmount()
  })
})
