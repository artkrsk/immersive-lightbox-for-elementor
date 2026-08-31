// @vitest-environment happy-dom

import { registerAspectFit } from '@ts/content/registerAspectFit'
import type { ISlideData } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function resizeEvent(
  data: ISlideData,
  element: HTMLElement | undefined,
  width: number,
  height: number
) {
  return { content: { data, element }, width, height, preventDefault: vi.fn() }
}

describe('registerAspectFit', () => {
  it('leaves non-video content alone', () => {
    const pswp = fakePswp()
    registerAspectFit(pswp as unknown as PhotoSwipe)
    const data: ISlideData = { key: 'k', type: 'image', src: '' }
    const el = document.createElement('img')
    const e = resizeEvent(data, el, 800, 600)

    pswp.emit('contentResize', e)

    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(el.style.width).toBe('')
  })

  it('does nothing when the video content has no element yet', () => {
    const pswp = fakePswp()
    registerAspectFit(pswp as unknown as PhotoSwipe)
    const data: ISlideData = { key: 'k', type: 'video', src: '' }
    const e = resizeEvent(data, undefined, 800, 600)

    pswp.emit('contentResize', e)

    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('aspect-fits a video with declared dims', () => {
    const pswp = fakePswp()
    registerAspectFit(pswp as unknown as PhotoSwipe)
    const data: ISlideData = { key: 'k', type: 'video', src: '', width: 1600, height: 900 }
    const el = document.createElement('video')
    const e = resizeEvent(data, el, 800, 600)

    pswp.emit('contentResize', e)

    expect(e.preventDefault).toHaveBeenCalledTimes(1)
    expect(el.style.width).toBe('800px')
    expect(el.style.height).toBe('450px')
  })

  it('falls back to the 16/9 default aspect when dims are missing', () => {
    const pswp = fakePswp()
    registerAspectFit(pswp as unknown as PhotoSwipe)
    const data: ISlideData = { key: 'k', type: 'video', src: '' }
    const el = document.createElement('video')
    const e = resizeEvent(data, el, 400, 400)

    pswp.emit('contentResize', e)

    expect(e.preventDefault).toHaveBeenCalledTimes(1)
    expect(el.style.width).toBe('400px')
    expect(el.style.height).toBe('225px')
  })
})
