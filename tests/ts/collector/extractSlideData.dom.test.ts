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

  it('a video-marker anchor becomes a video slide, its poster href the placeholder', () => {
    const el = anchor(`
      <a
        href="https://example.com/poster.jpg"
        data-elementor-open-lightbox="yes"
        data-elementor-lightbox-video="https://www.youtube.com/embed/aqz-KE-bpKQ"
      >watch</a>
    `)
    const data = extractSlideData(el)
    expect(data.type).toBe('video')
    expect(data.src).toBe('https://www.youtube.com/embed/aqz-KE-bpKQ')
    expect(data.videoEmbed).toBe('youtube')
    expect(data.msrc).toBe('https://example.com/poster.jpg')
  })

  it('keeps Elementor’s title and description as two fields, like native', () => {
    const both = anchor(`
      <a href="https://example.com/a.jpg" data-elementor-open-lightbox="yes"
        data-elementor-lightbox-title="The title"
        data-elementor-lightbox-description="The description">
        <img src="t.jpg" alt="" />
      </a>
    `)
    const data = extractSlideData(both)
    expect(data.caption).toBe('The title')
    expect(data.description).toBe('The description')

    // A description never stands in for a missing title: native shows it on
    // its own line below an empty one, and so do we. The title tiers carry
    // on to the alt as before.
    const described = anchor(`
      <a href="https://example.com/a.jpg" data-elementor-open-lightbox="yes"
        data-elementor-lightbox-description="Only a description">
        <img src="t.jpg" alt="From alt" />
      </a>
    `)
    const only = extractSlideData(described)
    expect(only.caption).toBe('From alt')
    expect(only.description).toBe('Only a description')
  })

  it('lets our description attribute outrank Elementor’s, with no DOM fallback', () => {
    const ours = anchor(`
      <a href="https://example.com/a.jpg" data-arts-lightbox
        data-arts-lightbox-description="Ours"
        data-elementor-lightbox-description="Theirs">
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(ours).description).toBe('Ours')

    const bare = anchor(`
      <figure>
        <a href="https://example.com/a.jpg" data-arts-lightbox><img src="t.jpg" alt="Alt" /></a>
        <figcaption>A figcaption</figcaption>
      </figure>
    `)
    expect(extractSlideData(bare).description).toBeUndefined()
  })

  it('marks a dimension-less image slide for the natural upgrade', () => {
    // Pro Media Carousel image slides are background-image DIVS — no inner
    // img, nothing to read dims from; SVG attachments without WP meta render
    // the same way. Without the flag, pswp gets undefined dims and stretches.
    const el = anchor(`
      <a href="https://example.com/full.png" data-elementor-open-lightbox="yes">
        <div style="background-image: url('https://example.com/full.png')"></div>
      </a>
    `)
    const data = extractSlideData(el)
    expect(data.type).toBe('image')
    expect(data.width).toBeUndefined()
    expect(data.dimsGuessed).toBe(true)
  })

  it('reads Elementor’s stamped title after our attribute, before figcaption', () => {
    const stamped = anchor(`
      <figure>
        <a href="https://example.com/a.jpg" data-elementor-open-lightbox="yes"
          data-elementor-lightbox-title="From Elementor">
          <img src="t.jpg" alt="From alt" />
        </a>
        <figcaption>From figcaption</figcaption>
      </figure>
    `)
    expect(extractSlideData(stamped).caption).toBe('From Elementor')

    const ours = anchor(`
      <a href="https://example.com/a.jpg" data-arts-lightbox data-arts-lightbox-caption="Ours"
        data-elementor-lightbox-title="From Elementor">
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(ours).caption).toBe('Ours')
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

  it('borrows a wrapped <video> for dims and poster, but never for the source', () => {
    // The widget shape: an anchor to the file, wrapping the page's own
    // player. href is the source; the element only supplies the thumbnail.
    document.body.innerHTML = `
      <a href="https://example.com/bg.mp4" data-arts-lightbox>
        <video src="https://example.com/inline.mp4" width="2528" height="1696"
               poster="https://example.com/poster.jpg" autoplay muted loop playsinline></video>
      </a>
    `
    const el = document.querySelector('a[data-arts-lightbox]') as HTMLElement
    const data = extractSlideData(el)
    expect(data.type).toBe('video')
    expect(data.src).toContain('/bg.mp4')
    expect(data.width).toBe(2528)
    expect(data.height).toBe(1696)
    expect(data.msrc).toContain('/poster.jpg')
  })

  it('never sizes a video slide from the image that triggered it', () => {
    // A Vimeo link hung on a portrait photo: the photo is the poster, and its
    // aspect says nothing about the player. Taking it left the embed in a
    // portrait box, letterboxing itself inside black bars.
    const el = anchor(`
      <a href="https://vimeo.com/177110108" data-arts-lightbox>
        <img src="pi-01-01.jpg" width="1400" height="1648" alt="" />
      </a>
    `)
    const data = extractSlideData(el)

    expect(data.type).toBe('video')
    expect(data.width).toBeUndefined()
    expect(data.height).toBeUndefined()
    // The poster is still the author's own image — only the box is refused.
    expect(data.msrc).toContain('pi-01-01.jpg')
  })

  it('still takes dims a video slide states outright', () => {
    const el = anchor(`
      <a href="https://vimeo.com/177110108" data-arts-lightbox
         data-arts-lightbox-width="1080" data-arts-lightbox-height="1920">
        <img src="t.jpg" width="1400" height="1648" alt="" />
      </a>
    `)
    const data = extractSlideData(el)

    expect(data.width).toBe(1080)
    expect(data.height).toBe(1920)
  })

  it('carries the Vimeo private hash and YouTube start into slide data', () => {
    const vimeo = anchor(`
      <a href="https://vimeo.com/617673871/701316cc64" data-arts-lightbox>
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(vimeo).videoHash).toBe('701316cc64')

    const yt = anchor(`
      <a href="https://youtu.be/dQw4w9WgXcQ?t=90" data-arts-lightbox>
        <img src="t.jpg" alt="" />
      </a>
    `)
    expect(extractSlideData(yt).videoStart).toBe(90)
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

  it('derives a thumbnail for a hosted video that carries no image', () => {
    const el = document.createElement('a')
    el.setAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    el.setAttribute('data-arts-lightbox', '')

    // A bare link to YouTube has nothing to borrow — without this it renders
    // as an index number in the thumbnail strip.
    expect(extractSlideData(el).msrc).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')
  })

  it('never overrides a thumbnail the author supplied', () => {
    const el = document.createElement('a')
    el.setAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    el.setAttribute('data-arts-lightbox', '')
    const img = document.createElement('img')
    img.setAttribute('src', '/mine.jpg')
    el.appendChild(img)

    // currentSrc resolves to an absolute URL, so match the tail.
    expect(extractSlideData(el).msrc).toMatch(/\/mine\.jpg$/)
    expect(extractSlideData(el).msrc).not.toContain('ytimg')
  })

  // Vimeo's poster is not derivable, so extraction stays synchronous and hands
  // the strip the id and hash to go asking with.
  it('carries a Vimeo id and hash instead of a thumbnail', () => {
    const el = document.createElement('a')
    el.setAttribute('href', 'https://vimeo.com/123456789/abc1234567')
    el.setAttribute('data-arts-lightbox', '')
    const data = extractSlideData(el)

    expect(data.msrc).toBeUndefined()
    expect(data.videoEmbed).toBe('vimeo')
    expect(data.videoId).toBe('123456789')
    expect(data.videoHash).toBe('abc1234567')
  })
})
