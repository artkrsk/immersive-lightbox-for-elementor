// @vitest-environment happy-dom

import { registerDimsUpgrade } from '@ts/content/upgradeGuessedDims'
import type { ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

interface IFakeContent {
  element: unknown
  data: ISlideData
  width: number
  height: number
}

function decodedImage(): HTMLImageElement {
  const img = document.createElement('img')
  Object.defineProperty(img, 'naturalWidth', { value: 1200 })
  Object.defineProperty(img, 'naturalHeight', { value: 800 })
  return img
}

/** A Slide copies its box from the content it adopts (slide.ts constructor). */
function holderFor(content: IFakeContent) {
  return {
    width: content.width,
    height: content.height,
    data: content.data,
    content,
    calculateSize: vi.fn(),
    zoomAndPanToInitial: vi.fn(),
    applyCurrentZoomPan: vi.fn(),
    updateContentSize: vi.fn()
  }
}

/** A guessed 3200-box item whose image has already decoded at 1200x800. */
function guessed() {
  const data: ISlideData = {
    key: 'k',
    type: 'image',
    src: '/x.svg',
    width: 3200,
    height: 2133,
    dimsGuessed: true
  }
  const content: IFakeContent = { element: decodedImage(), data, width: 3200, height: 2133 }
  return { data, content, slide: holderFor(content) }
}

describe('registerDimsUpgrade — a holder built for an already-decoded image', () => {
  it('sizes the slide from the naturals before it is ever appended', () => {
    // The preloader loads well past the holder window and its contents carry
    // no slide, so Content.onLoaded dispatches nothing for them. The holder
    // that later adopts such a content is the first chance to correct it —
    // and it comes before append(), so the slide never paints the guess.
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const { slide, content, data } = guessed()

    pswp.emit('slideInit', { slide })

    expect(slide.width).toBe(1200)
    expect(slide.height).toBe(800)
    expect(content.width).toBe(1200)
    expect(data.dimsGuessed).toBe(false)
    // append() sizes and places the slide right after this — re-running the
    // resize recipe here would be redundant work on a slide with no layout yet.
    expect(slide.calculateSize).not.toHaveBeenCalled()
  })

  it('leaves author-declared dimensions alone', () => {
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const data: ISlideData = {
      key: 'k',
      type: 'image',
      src: '/x.svg',
      width: 900,
      height: 600
    }
    const content: IFakeContent = { element: decodedImage(), data, width: 900, height: 600 }

    pswp.emit('slideInit', { slide: holderFor(content) })

    expect(data.width).toBe(900)
    expect(content.width).toBe(900)
  })

  it('does nothing while the image is still undecoded', () => {
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const { data, content } = guessed()
    content.element = document.createElement('img')
    const slide = holderFor(content)

    pswp.emit('slideInit', { slide })

    expect(slide.width).toBe(3200)
    expect(data.dimsGuessed).toBe(true)
  })
})

describe('registerDimsUpgrade — an image that decodes while a holder shows it', () => {
  it('corrects the slide and re-runs the resize recipe', () => {
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const { slide, content, data } = guessed()

    pswp.emit('loadComplete', { content, slide })

    expect(slide.width).toBe(1200)
    expect(data.dimsGuessed).toBe(false)
    expect(slide.calculateSize).toHaveBeenCalled()
    expect(slide.zoomAndPanToInitial).toHaveBeenCalled()
    expect(slide.applyCurrentZoomPan).toHaveBeenCalled()
    expect(slide.updateContentSize).toHaveBeenCalledWith(true)
  })

  it('corrects the content too, so the next holder is built at the right size', () => {
    // Contents outlive slides — the loader caches them by index. Correcting
    // only the slide is why the guess came back on every lap through the
    // gallery: each new holder copied the interim box from the stale content.
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const { slide, content } = guessed()

    pswp.emit('loadComplete', { content, slide })

    expect(holderFor(content).width).toBe(1200)
  })

  it('skips the resize when the slide already matches', () => {
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const { content } = guessed()
    const slide = holderFor(content)
    slide.width = 1200
    slide.height = 800

    pswp.emit('loadComplete', { content, slide })

    expect(slide.calculateSize).not.toHaveBeenCalled()
  })

  it('does nothing when the content is not an image', () => {
    const pswp = fakePswp()
    registerDimsUpgrade(pswp as unknown as PhotoSwipe)
    const data: ISlideData = {
      key: 'k',
      type: 'video',
      src: '/x.mp4',
      width: 1280,
      height: 720,
      dimsGuessed: true
    }
    const content: IFakeContent = {
      element: document.createElement('video'),
      data,
      width: 1280,
      height: 720
    }
    const slide = holderFor(content)

    pswp.emit('loadComplete', { content, slide })

    expect(slide.calculateSize).not.toHaveBeenCalled()
    expect(data.dimsGuessed).toBe(true)
  })
})
