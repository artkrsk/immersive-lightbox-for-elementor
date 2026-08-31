// @vitest-environment happy-dom

import { findCandidates } from '@ts/collector/findCandidates'
import { describe, expect, it } from 'vitest'

describe('findCandidates', () => {
  it('selects only marked anchors and skips opted-out ones', () => {
    document.body.innerHTML = `
      <a href="/a.jpg" data-arts-lightbox><img src="a-t.jpg" alt="" /></a>
      <a href="/plain.jpg"><img src="p-t.jpg" alt="" /></a>
      <a href="/off.jpg" data-arts-lightbox data-arts-lightbox-off><img src="o-t.jpg" alt="" /></a>
      <div data-arts-lightbox-off>
        <a href="/nested-off.jpg" data-arts-lightbox><img src="n-t.jpg" alt="" /></a>
      </div>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.src).toContain('/a.jpg')
  })

  it('flags clones from Swiper duplicates and from our own attribute', () => {
    document.body.innerHTML = `
      <div class="swiper-slide swiper-slide-duplicate">
        <a href="/dup.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
      </div>
      <a href="/marked.jpg" data-arts-lightbox data-arts-lightbox-clone><img src="t.jpg" alt="" /></a>
      <a href="/real.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
    `
    const [swiper, marked, real] = findCandidates(document)
    expect(swiper?.isClone).toBe(true)
    expect(marked?.isClone).toBe(true)
    expect(real?.isClone).toBe(false)
  })

  it('resolves the group id from the element or the closest group container', () => {
    document.body.innerHTML = `
      <a href="/own.jpg" data-arts-lightbox data-arts-lightbox-group="g-own"><img src="t.jpg" alt="" /></a>
      <div data-arts-lightbox-group="g-container">
        <a href="/inherited.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
      </div>
      <a href="/none.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
    `
    const [own, inherited, none] = findCandidates(document)
    expect(own?.groupId).toBe('g-own')
    expect(inherited?.groupId).toBe('g-container')
    expect(none?.groupId).toBeNull()
  })

  it('accepts links Elementor stamped, but only the explicit yes', () => {
    document.body.innerHTML = `
      <a href="/stamped.jpg" data-elementor-open-lightbox="yes"><img src="s-t.jpg" alt="" /></a>
      <a href="/refused.jpg" data-elementor-open-lightbox="no"><img src="r-t.jpg" alt="" /></a>
      <a href="/stamped-off.jpg" data-elementor-open-lightbox="yes" data-arts-lightbox-off>
        <img src="so-t.jpg" alt="" />
      </a>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.src).toContain('/stamped.jpg')
  })

  it('accepts a video-overlay div and drops candidates whose extraction yields nothing', () => {
    const payload = JSON.stringify({
      type: 'video',
      videoType: 'hosted',
      url: 'https://example.com/clip.mp4',
      modalOptions: { videoAspectRatio: '169' }
    })
    document.body.innerHTML = `
      <div data-elementor-open-lightbox="yes" data-elementor-lightbox='${payload}'>
        <img src="poster.jpg" alt="" />
      </div>
      <div data-elementor-open-lightbox="yes" data-elementor-lightbox="{broken">
        <img src="poster.jpg" alt="" />
      </div>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.src).toBe('https://example.com/clip.mp4')
    expect(candidates[0]?.data.type).toBe('video')
  })

  it('keeps sourceless html slides while dropping genuinely empty candidates', () => {
    document.body.innerHTML = `
      <template id="tpl"><p>hi</p></template>
      <div data-arts-lightbox data-arts-lightbox-type="html" data-arts-lightbox-html="#tpl"></div>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.type).toBe('html')
  })

  it('sweeps bare image links only when the native fallback is on', () => {
    document.body.innerHTML = `
      <a href="/bare.jpg"><img src="t.jpg" alt="" /></a>
      <a href="/stamped.jpg" data-elementor-open-lightbox="yes"><img src="t.jpg" alt="" /></a>
      <a href="/page.html">not an image</a>
      <a href="/refused.jpg" data-elementor-open-lightbox="no"><img src="t.jpg" alt="" /></a>
    `
    expect(findCandidates(document).map((c) => c.data.src)).toEqual(['/stamped.jpg'])
    // One pass in DOM order — slide order inside a shared bucket must follow
    // the page, and a link matching both arms appears once.
    expect(findCandidates(document, true).map((c) => c.data.src)).toEqual([
      '/bare.jpg',
      '/stamped.jpg'
    ])
  })

  it('routes lightbox action hashes through the payload, drops other actions', () => {
    const lightbox = `#${encodeURIComponent(
      `elementor-action:action=lightbox&settings=${btoa(
        JSON.stringify({ id: 5, url: 'https://example.com/full.jpg', slideshow: 'w9' })
      )}`
    )}`
    const popup = `#${encodeURIComponent(`elementor-action:action=popup&settings=${btoa('{"id":7}')}`)}`
    document.body.innerHTML = `
      <a href="${lightbox}"><img src="t.jpg" alt="" /></a>
      <a href="${popup}">popup</a>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.src).toBe('https://example.com/full.jpg')
    expect(candidates[0]?.data.type).toBe('image')
    expect(candidates[0]?.groupId).toBe('w9')
  })

  it('maps Elementor slideshow ids onto our groups, our own attribute winning', () => {
    document.body.innerHTML = `
      <a href="/e1.jpg" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="w123">
        <img src="t.jpg" alt="" />
      </a>
      <a
        href="/both.jpg"
        data-elementor-open-lightbox="yes"
        data-elementor-lightbox-slideshow="w123"
        data-arts-lightbox-group="ours"
      >
        <img src="t.jpg" alt="" />
      </a>
      <div data-arts-lightbox-group="ancestor">
        <a href="/nested.jpg" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="w123">
          <img src="t.jpg" alt="" />
        </a>
      </div>
    `
    const [stamped, both, nested] = findCandidates(document)
    expect(stamped?.groupId).toBe('w123')
    expect(both?.groupId).toBe('ours')
    // Our vocabulary wins even from an ancestor: the slideshow id on the
    // element itself does not outrank an author's explicit grouping.
    expect(nested?.groupId).toBe('ancestor')
  })
})
