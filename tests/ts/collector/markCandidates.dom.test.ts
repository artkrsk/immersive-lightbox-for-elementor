// @vitest-environment happy-dom

import { markCandidates } from '@ts/collector/markCandidates'
import { LINK_CLASS } from '@ts/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'

const marked = (): string[] =>
  [...document.querySelectorAll(`.${LINK_CLASS}`)].map((el) => el.getAttribute('href') ?? '')

afterEach(() => {
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'artsCursor')
})

describe('markCandidates', () => {
  it('stamps explicit vocabulary and Elementor-stamped links, honoring off', () => {
    document.body.innerHTML = `
      <a href="/a.jpg" data-arts-lightbox><img src="a-t.jpg" alt="" /></a>
      <a href="/b.jpg" data-elementor-open-lightbox="yes"><img src="b-t.jpg" alt="" /></a>
      <a href="/c.jpg" data-elementor-open-lightbox="no"><img src="c-t.jpg" alt="" /></a>
      <a href="/off.jpg" data-arts-lightbox data-arts-lightbox-off><img src="o-t.jpg" alt="" /></a>
      <div data-arts-lightbox-off>
        <a href="/nested-off.jpg" data-arts-lightbox><img src="n-t.jpg" alt="" /></a>
      </div>
    `
    markCandidates(false)
    expect(marked()).toEqual(['/a.jpg', '/b.jpg'])
  })

  it('consults bare links only under the kit fallback', () => {
    document.body.innerHTML = '<a href="/bare.jpg"><img src="t.jpg" alt="" /></a>'
    markCandidates(false)
    expect(marked()).toEqual([])
    markCandidates(true)
    expect(marked()).toEqual(['/bare.jpg'])
  })

  it('releases non-lightbox Elementor actions', () => {
    const popup = `#${encodeURIComponent('elementor-action:action=popup&settings=e30=')}`
    const light = `#${encodeURIComponent('elementor-action:action=lightbox&settings=e30=')}`
    document.body.innerHTML = `<a href="${popup}">p</a><a href="${light}">l</a>`
    markCandidates(false)
    expect(marked()).toEqual([light])
  })

  it('drops stale marks on re-scan and nudges the follower', () => {
    document.body.innerHTML = '<a href="/a.jpg" data-arts-lightbox></a>'
    const refresh = vi.fn()
    window.artsCursor = { get: () => ({ refresh }) }
    markCandidates(false)
    const a = document.querySelector('a') as HTMLElement
    expect(a.classList.contains(LINK_CLASS)).toBe(true)
    a.removeAttribute('data-arts-lightbox')
    markCandidates(false)
    expect(a.classList.contains(LINK_CLASS)).toBe(false)
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
