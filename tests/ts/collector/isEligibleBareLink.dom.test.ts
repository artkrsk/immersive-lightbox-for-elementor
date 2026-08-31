// @vitest-environment happy-dom

import { isEligibleBareLink } from '@ts/collector/isEligibleBareLink'
import { describe, expect, it } from 'vitest'

function link(html: string): HTMLElement {
  document.body.innerHTML = html
  const el = document.body.firstElementChild as HTMLElement
  return el.tagName === 'A' ? el : (el.querySelector('a') as HTMLElement)
}

describe('isEligibleBareLink', () => {
  it('accepts image-extension hrefs, query strings included', () => {
    for (const href of [
      '/a.jpg',
      '/b.jpeg',
      '/c.png',
      '/d.gif',
      '/e.svg',
      '/f.webp',
      '/g.avif',
      '/h.jpg?w=1200'
    ]) {
      expect(isEligibleBareLink(link(`<a href="${href}">x</a>`))).toBe(true)
    }
  })

  it('rejects everything Elementor would reject', () => {
    expect(isEligibleBareLink(link('<a href="/doc.pdf">x</a>'))).toBe(false)
    expect(isEligibleBareLink(link('<a href="/clip.mp4">x</a>'))).toBe(false)
    expect(isEligibleBareLink(link('<a href="/page/">x</a>'))).toBe(false)
    expect(isEligibleBareLink(link('<a href="/a.jpg" download>x</a>'))).toBe(false)
    // Elementor's regex is anchored — a query string BEFORE the extension
    // breaks its [^?]+ prefix, so this is not an image link to it either.
    expect(isEligibleBareLink(link('<a href="/redirect.php?next=photo.jpg">x</a>'))).toBe(false)
    expect(
      isEligibleBareLink(link('<a href="/a.jpg" data-elementor-open-lightbox="no">x</a>'))
    ).toBe(false)
    expect(isEligibleBareLink(document.createElement('div'))).toBe(false)
  })

  it('lets the video marker bypass the extension guard, as Elementor does', () => {
    expect(
      isEligibleBareLink(
        link('<a href="/poster.jpg" data-elementor-lightbox-video="https://e.com/embed/1">x</a>')
      )
    ).toBe(true)
    expect(
      isEligibleBareLink(
        link('<a href="/watch/" data-elementor-lightbox-video="https://e.com/embed/1">x</a>')
      )
    ).toBe(true)
  })

  it('honors our own opt-out, self or ancestor', () => {
    expect(isEligibleBareLink(link('<a href="/a.jpg" data-arts-lightbox-off>x</a>'))).toBe(false)
    expect(
      isEligibleBareLink(link('<div data-arts-lightbox-off><a href="/a.jpg">x</a></div>'))
    ).toBe(false)
  })
})
