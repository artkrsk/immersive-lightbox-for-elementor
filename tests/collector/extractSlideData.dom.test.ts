// @vitest-environment happy-dom

import { extractSlideData } from '@ts/collector/extractSlideData'
import { describe, expect, it } from 'vitest'

function anchor(html: string): HTMLElement {
  document.body.innerHTML = html
  const el = document.querySelector('a')
  if (!el) {
    throw new Error('fixture has no anchor')
  }
  return el
}

describe('extractSlideData', () => {
  it('extracts an image slide from anchor + thumb', () => {
    const el = anchor(`
      <a href="https://example.com/full.jpg" data-arts-lightbox
         data-arts-lightbox-width="2400" data-arts-lightbox-height="1600">
        <img src="https://example.com/thumb.jpg" width="600" height="400" alt="A photo" />
      </a>
    `)
    const data = extractSlideData(el)
    expect(data.type).toBe('image')
    expect(data.src).toBe('https://example.com/full.jpg')
    expect(data.width).toBe(2400)
    expect(data.height).toBe(1600)
    expect(data.msrc).toBe('https://example.com/thumb.jpg')
    expect(data.caption).toBe('A photo')
  })

  it('falls back to img dimension attributes when data attrs are absent', () => {
    const el = anchor(`
      <a href="https://example.com/full.jpg" data-arts-lightbox>
        <img src="t.jpg" width="600" height="400" alt="" />
      </a>
    `)
    const data = extractSlideData(el)
    expect(data.width).toBe(600)
    expect(data.height).toBe(400)
  })

  it('prefers the caption attribute, then figcaption, then alt', () => {
    const attr = anchor(`
      <figure>
        <a href="https://example.com/a.jpg" data-arts-lightbox data-arts-lightbox-caption="From attr">
          <img src="t.jpg" alt="From alt" />
        </a>
        <figcaption>From figcaption</figcaption>
      </figure>
    `)
    expect(extractSlideData(attr).caption).toBe('From attr')

    const fig = anchor(`
      <figure>
        <a href="https://example.com/a.jpg" data-arts-lightbox>
          <img src="t.jpg" alt="From alt" />
        </a>
        <figcaption>From figcaption</figcaption>
      </figure>
    `)
    expect(extractSlideData(fig).caption).toBe('From figcaption')

    const alt = anchor(`
      <a href="https://example.com/a.jpg" data-arts-lightbox>
        <img src="t.jpg" alt="From alt" />
      </a>
    `)
    expect(extractSlideData(alt).caption).toBe('From alt')
  })

  it('derives the canonical key from data-id, else the normalized URL', () => {
    const explicit = anchor(`
      <a href="https://example.com/a.jpg" data-arts-lightbox data-arts-lightbox-id="my-slide">
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(explicit).key).toBe('my-slide')

    const normalized = anchor(`
      <a href="https://example.com/a.jpg?utm_source=x&w=1200#section" data-arts-lightbox>
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(normalized).key).toBe('https://example.com/a.jpg?w=1200')
  })

  it('extracts video slides with provider info', () => {
    const yt = anchor(`
      <a href="https://youtu.be/dQw4w9WgXcQ" data-arts-lightbox>
        <img src="t.jpg" alt="" />
      </a>
    `)
    const data = extractSlideData(yt)
    expect(data.type).toBe('video')
    expect(data.videoEmbed).toBe('youtube')
    expect(data.videoSrc).toBe('https://youtu.be/dQw4w9WgXcQ')
  })

  it('resolves html slide content from the referenced selector', () => {
    document.body.innerHTML = `
      <template id="tpl"><p>Hello</p></template>
      <div id="content-src"><p>Inline content</p></div>
    `
    const el = document.createElement('a')
    el.setAttribute('href', '#')
    el.setAttribute('data-arts-lightbox', '')
    el.setAttribute('data-arts-lightbox-type', 'html')
    el.setAttribute('data-arts-lightbox-html', '#content-src')
    document.body.appendChild(el)
    const data = extractSlideData(el)
    expect(data.type).toBe('html')
    expect(data.html).toContain('Inline content')
  })
})
