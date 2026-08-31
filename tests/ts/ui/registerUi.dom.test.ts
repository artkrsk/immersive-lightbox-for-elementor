// @vitest-environment happy-dom

import { DEFAULT_OPTIONS } from '@ts/constants'
import { mergeOptions } from '@ts/core/mergeOptions'
import type { IGallery, ILightboxApi, IOptions } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import type { TDeepPartial } from '@ts/types'
import { registerUi } from '@ts/ui/registerUi'
import { describe, expect, it, vi } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function gallery(count: number): IGallery {
  return {
    id: 'g',
    slides: Array.from({ length: count }, (_, i) => ({
      key: `k${i}`,
      type: 'image' as const,
      src: `/${i}.jpg`
    })),
    elementsByKey: new Map()
  }
}

function api(): ILightboxApi {
  return { close: vi.fn(), next: vi.fn(), prev: vi.fn(), goTo: vi.fn() }
}

function registeredClasses(count: number, opts: IOptions = DEFAULT_OPTIONS): string {
  const pswp = fakePswp()
  registerUi(pswp as unknown as PhotoSwipe, gallery(count), opts, api())
  pswp.emit('uiRegister', {})
  const classes: string[] = []
  for (let i = 0; ; i++) {
    try {
      classes.push(pswp.uiElementAt(i).className)
    } catch {
      break
    }
  }
  return classes.join(' ')
}

function registerWithElement(
  count: number,
  optionsOverride: TDeepPartial<IOptions>
): { pswp: ReturnType<typeof fakePswp>; opts: IOptions; api: ILightboxApi } {
  const opts = mergeOptions(optionsOverride)
  const pswp = fakePswp()
  pswp.element = document.createElement('div')
  const lightboxApi = api()
  registerUi(pswp as unknown as PhotoSwipe, gallery(count), opts, lightboxApi)
  return { pswp, opts, api: lightboxApi }
}

describe('registerUi', () => {
  it('registers no arrows and no counter for a single slide — both meaningless', () => {
    const classes = registeredClasses(1)
    expect(classes).not.toContain('arts-lightbox-arrow')
    expect(classes).not.toContain('arts-lightbox-counter')
    expect(classes).toContain('arts-lightbox-close')
  })

  it('registers no strip for a single slide either', () => {
    const classes = registeredClasses(1, mergeOptions({ ui: { thumbnails: true } }))
    expect(classes).not.toContain('arts-lightbox-thumbs')

    const { pswp } = registerWithElement(1, { ui: { thumbnails: true } })
    pswp.emit('firstUpdate', {})
    expect(pswp.element?.classList.contains('arts-lightbox-has-thumbs_bottom')).toBe(false)
  })

  it('registers arrows and counter once there is somewhere to go', () => {
    const classes = registeredClasses(2)
    expect(classes).toContain('arts-lightbox-arrow_prev')
    expect(classes).toContain('arts-lightbox-arrow_next')
    expect(classes).toContain('arts-lightbox-counter')
  })

  it('registers the thumbnails strip and its position class only when ui.thumbnails is true', () => {
    const classes = registeredClasses(
      2,
      mergeOptions({ ui: { thumbnails: true, thumbnailsPosition: 'bottom' } })
    )
    expect(classes).toContain('arts-lightbox-thumbs_bottom')

    const { pswp } = registerWithElement(2, {
      ui: { thumbnails: true, thumbnailsPosition: 'bottom' }
    })
    pswp.emit('firstUpdate', {})
    expect(pswp.element?.classList.contains('arts-lightbox-has-thumbs_bottom')).toBe(true)
  })

  it('names the top bar for theme chrome before open is announced', () => {
    const { pswp } = registerWithElement(1, {})
    pswp.topBar = document.createElement('div')
    pswp.emit('firstUpdate', {})
    expect(pswp.topBar.classList.contains('arts-lightbox-bar')).toBe(true)
  })
})
