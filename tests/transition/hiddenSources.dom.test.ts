// @vitest-environment happy-dom

import type { IGallery, IOpenRequest } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { createHiddenSources } from '@ts/transition/hiddenSources'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function request(): { req: IOpenRequest; a: HTMLElement; aClone: HTMLElement; b: HTMLElement } {
  document.body.innerHTML = `
    <a id="a" href="/a.jpg"></a>
    <a id="a-clone" href="/a.jpg"></a>
    <a id="b" href="/b.jpg"></a>
  `
  const a = document.querySelector('#a') as HTMLElement
  const aClone = document.querySelector('#a-clone') as HTMLElement
  const b = document.querySelector('#b') as HTMLElement
  const gallery: IGallery = {
    id: 'g',
    slides: [
      { key: 'a', type: 'image', src: '/a.jpg' },
      { key: 'b', type: 'image', src: '/b.jpg' }
    ],
    elementsByKey: new Map([
      ['a', [a, aClone]],
      ['b', [b]]
    ])
  }
  return { req: { gallery, index: 0, sourceElement: a }, a, aClone, b }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('createHiddenSources', () => {
  it('restores everything on destroy', () => {
    const pswp = fakePswp()
    const { req, a, b } = request()
    const hidden = createHiddenSources(pswp as unknown as PhotoSwipe, req)
    hidden.hide(a)
    hidden.hide(b)
    expect(a.style.visibility).toBe('hidden')
    expect(b.style.visibility).toBe('hidden')
    pswp.emit('destroy', {})
    expect(a.style.visibility).toBe('')
    expect(b.style.visibility).toBe('')
  })

  it('a slide change releases only elements NOT showing the current key', () => {
    const pswp = fakePswp()
    const { req, a, aClone, b } = request()
    const hidden = createHiddenSources(pswp as unknown as PhotoSwipe, req)
    hidden.hide(a)
    hidden.hide(aClone)
    hidden.hide(b)

    pswp.currIndex = 0 // current key 'a' — its instances stay hidden
    pswp.emit('change', {})
    expect(a.style.visibility).toBe('hidden')
    expect(aClone.style.visibility).toBe('hidden')
    expect(b.style.visibility).toBe('')

    pswp.currIndex = 1 // moved to 'b' — the 'a' instances release
    pswp.emit('change', {})
    expect(a.style.visibility).toBe('')
    expect(aClone.style.visibility).toBe('')
  })
})
