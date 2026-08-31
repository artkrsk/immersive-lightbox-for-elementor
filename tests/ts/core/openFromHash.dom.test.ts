// @vitest-environment happy-dom

import { openFromHash } from '@ts/core/openFromHash'
import type { ILightbox } from '@ts/interfaces'
import { describe, expect, it, vi } from 'vitest'

function fakeLightbox() {
  return {
    init: vi.fn(),
    destroy: vi.fn(),
    open: vi.fn(() => true),
    version: '0.0.0'
  } as unknown as ILightbox
}

const HASH = `#${encodeURIComponent(
  `elementor-action:action=lightbox&settings=${btoa('{"url":"https://example.com/a.jpg"}')}`
)}`

describe('openFromHash', () => {
  it('prefers data-e-action-hash on any element — how native widgets carry it', () => {
    // The real image href + separate action-hash attribute is what every
    // native widget stamps; the Video widget carries it on a bare div.
    document.body.innerHTML = `
      <a id="native" href="https://example.com/full.jpg"
        data-elementor-open-lightbox="yes" data-e-action-hash="${HASH}">open</a>
    `
    location.hash = HASH
    const lightbox = fakeLightbox()

    openFromHash(lightbox)

    expect(lightbox.open).toHaveBeenCalledTimes(1)
    expect((lightbox.open as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.id).toBe('native')
    location.hash = ''
  })

  it('opens the anchor on the page carrying the loaded lightbox hash', () => {
    document.body.innerHTML = `<a id="trigger" href="${HASH}">open</a>`
    location.hash = HASH
    const lightbox = fakeLightbox()

    openFromHash(lightbox)

    expect(lightbox.open).toHaveBeenCalledTimes(1)
    expect((lightbox.open as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.id).toBe('trigger')
    location.hash = ''
  })

  it('no-ops for non-lightbox hashes and for hashes with no backing anchor', () => {
    document.body.innerHTML = `<a href="${HASH}">open</a>`
    const lightbox = fakeLightbox()

    location.hash = '#some-section'
    openFromHash(lightbox)

    document.body.innerHTML = ''
    location.hash = HASH
    openFromHash(lightbox)

    expect(lightbox.open).not.toHaveBeenCalled()
    location.hash = ''
  })
})
