// @vitest-environment happy-dom

import { createMediaController } from '@ts/content/mediaController'
import type { IMediaState } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function mediaState(): IMediaState {
  return { bridges: new Map(), watchIntent: { index: -1 }, slideAutoplay: () => true }
}

describe('createMediaController — pauseAll', () => {
  it('skips holders whose element is not a video', () => {
    const pswp = fakePswp()
    const controller = createMediaController(pswp as unknown as PhotoSwipe, mediaState())
    pswp.mainScroll.itemHolders.push({
      slide: { content: { element: document.createElement('img') } }
    })

    expect(() => controller.pauseAll()).not.toThrow()
  })
})
