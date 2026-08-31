// @vitest-environment happy-dom

import { ATTR_OFF } from '@ts/constants'
import { mergeOptions } from '@ts/core/mergeOptions'
import { attachHoverPrefetch } from '@ts/interaction/hoverPrefetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let imageCtor: ReturnType<typeof vi.fn>
let detach: () => void

beforeEach(() => {
  imageCtor = vi.fn(function FakeImage(this: { src: string; onload: unknown; onerror: unknown }) {
    this.src = ''
    this.onload = null
    this.onerror = null
  })
  vi.stubGlobal('Image', imageCtor)
})

afterEach(() => {
  detach?.()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('attachHoverPrefetch', () => {
  it('is a no-op when prefetch.onHover is disabled', () => {
    document.body.innerHTML = `<a href="/a.jpg" data-arts-lightbox>x</a>`
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions({ prefetch: { onHover: false } }))

    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).not.toHaveBeenCalled()
    expect(() => detach()).not.toThrow()
  })

  it('ignores pointerover on a non-candidate element', () => {
    document.body.innerHTML = `<div id="plain">not a link</div>`
    const el = document.getElementById('plain') as HTMLElement
    detach = attachHoverPrefetch(mergeOptions())

    el.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).not.toHaveBeenCalled()
  })

  it('skips a candidate under an off-flagged ancestor', () => {
    document.body.innerHTML = `
      <div ${ATTR_OFF}>
        <a href="/a.jpg" data-arts-lightbox>x</a>
      </div>
    `
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions())

    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).not.toHaveBeenCalled()
  })

  it('skips a candidate that does not resolve to an image slide', () => {
    document.body.innerHTML = `<a href="https://example.com/clip.mp4" data-arts-lightbox>x</a>`
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions())

    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).not.toHaveBeenCalled()
  })

  it('prefetches the image for a valid candidate on pointerover', () => {
    document.body.innerHTML = `<a href="/a.jpg" data-arts-lightbox>x</a>`
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions())

    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).toHaveBeenCalledTimes(1)
  })

  it('dedupes the same href across pointerover and pointerdown', () => {
    document.body.innerHTML = `<a href="/a.jpg" data-arts-lightbox>x</a>`
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions())

    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))
    anchor.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(imageCtor).toHaveBeenCalledTimes(1)
  })

  it('detach removes both listeners so a later pointerover no longer prefetches', () => {
    document.body.innerHTML = `<a href="/a.jpg" data-arts-lightbox>x</a>`
    const anchor = document.querySelector('a') as HTMLAnchorElement
    detach = attachHoverPrefetch(mergeOptions())

    detach()
    anchor.dispatchEvent(new Event('pointerover', { bubbles: true }))

    expect(imageCtor).not.toHaveBeenCalled()
  })
})
