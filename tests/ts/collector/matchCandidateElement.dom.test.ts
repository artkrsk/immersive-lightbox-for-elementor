// @vitest-environment happy-dom

import { matchCandidateElement } from '@ts/collector/matchCandidateElement'
import { describe, expect, it } from 'vitest'

describe('matchCandidateElement', () => {
  it('resolves explicit candidates from a nested click target, fallback off', () => {
    document.body.innerHTML = `
      <a href="/a.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
    `
    const img = document.querySelector('img') as Element
    const anchor = document.querySelector('a')
    expect(matchCandidateElement(img, false)).toBe(anchor)
  })

  it('resolves bare image links only when the fallback is on', () => {
    document.body.innerHTML = `
      <a href="/bare.jpg"><img src="t.jpg" alt="" /></a>
    `
    const img = document.querySelector('img') as Element
    const anchor = document.querySelector('a')
    expect(matchCandidateElement(img, false)).toBeNull()
    expect(matchCandidateElement(img, true)).toBe(anchor)
  })

  it('never falls back for ineligible bare links', () => {
    document.body.innerHTML = `
      <a href="/page.html">not an image</a>
    `
    const target = document.querySelector('a') as Element
    expect(matchCandidateElement(target, true)).toBeNull()
  })

  it('applies Elementor’s anchor guard to stamped links — ours are exempt', () => {
    document.body.innerHTML = `
      <a id="dl" href="/a.jpg" data-elementor-open-lightbox="yes" download>x</a>
      <a id="pdf" href="/doc.pdf" data-elementor-open-lightbox="yes">x</a>
      <a id="marker" href="/doc.pdf" data-elementor-open-lightbox="yes"
        data-elementor-lightbox-video="https://e.com/embed/1">x</a>
      <a id="ours" href="/doc.pdf" data-arts-lightbox data-arts-lightbox-type="html"
        data-arts-lightbox-html="#tpl">x</a>
    `
    // Elementor's own client rejects these clicks; claiming them would turn
    // a download or a plain navigation into a broken slide.
    expect(matchCandidateElement(document.querySelector('#dl'), false)).toBeNull()
    expect(matchCandidateElement(document.querySelector('#pdf'), false)).toBeNull()
    expect(matchCandidateElement(document.querySelector('#marker'), false)?.id).toBe('marker')
    // Our explicit vocabulary is its own contract — no Elementor guard.
    expect(matchCandidateElement(document.querySelector('#ours'), false)?.id).toBe('ours')
  })

  it('claims lightbox action hashes but leaves other actions to Elementor', () => {
    const lightbox = `#${encodeURIComponent(`elementor-action:action=lightbox&settings=${btoa('{"url":"/a.jpg"}')}`)}`
    const popup = `#${encodeURIComponent(`elementor-action:action=popup&settings=${btoa('{"id":7}')}`)}`
    document.body.innerHTML = `
      <a id="lb" href="${lightbox}">open</a>
      <a id="pp" href="${popup}">popup</a>
    `
    expect(matchCandidateElement(document.querySelector('#lb'), false)?.id).toBe('lb')
    // A popup link must pass through untouched — claiming it would dead-click
    // Elementor's own URLActions handler.
    expect(matchCandidateElement(document.querySelector('#pp'), false)).toBeNull()
  })
})

describe('WooCommerce gallery ownership', () => {
  it('claims image and video anchors only inside our marked gallery', () => {
    document.body.innerHTML = `
      <div class="woocommerce-product-gallery arts-lightbox-wc-gallery">
        <div class="woocommerce-product-gallery__image"><a href="/photo.jpg"><img></a></div>
        <div class="woocommerce-product-gallery__image"><a href="/clip.mp4"><video></video></a></div>
      </div>
      <div class="woocommerce-product-gallery">
        <div class="woocommerce-product-gallery__image"><a href="/other.jpg"><img></a></div>
      </div>
    `
    const [photo, clip, other] = [...document.querySelectorAll('a')]
    expect(matchCandidateElement(photo ?? null, false)).toBe(photo)
    expect(matchCandidateElement(clip ?? null, false)).toBe(clip)
    expect(matchCandidateElement(other ?? null, false)).toBeNull()
  })

  it('honors opt-outs and refuses implicit downloads', () => {
    document.body.innerHTML = `
      <div class="arts-lightbox-wc-gallery">
        <div class="woocommerce-product-gallery__image">
          <a id="off" href="/off.jpg" data-arts-lightbox-off><img></a>
          <a id="download" href="/download.jpg" download><img></a>
          <a id="elementor-no" href="/no.jpg" data-elementor-open-lightbox="no"><img></a>
        </div>
      </div>
    `
    for (const id of ['off', 'download', 'elementor-no']) {
      expect(matchCandidateElement(document.getElementById(id), true)).toBeNull()
    }
  })

  it('lets WooCommerce own even explicitly opted-in links when it reclaims support', () => {
    document.body.innerHTML = `
      <div class="woocommerce-product-gallery arts-lightbox-wc-native">
        <div class="woocommerce-product-gallery__image">
          <a href="/photo.jpg" data-arts-lightbox><img></a>
        </div>
      </div>
    `
    expect(matchCandidateElement(document.querySelector('img'), true)).toBeNull()
  })
})
