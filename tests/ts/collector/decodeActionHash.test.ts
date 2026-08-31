import { decodeActionHash } from '@ts/collector/decodeActionHash'
import { describe, expect, it } from 'vitest'

/** Builds the href exactly like Elementor's PHP: '#'.rawurlencode(...). */
function actionHash(action: string, settings: unknown): string {
  return `#${encodeURIComponent(`elementor-action:action=${action}&settings=${btoa(JSON.stringify(settings))}`)}`
}

describe('decodeActionHash', () => {
  it('decodes the image payload from the percent-encoded form PHP prints', () => {
    const href = actionHash('lightbox', {
      id: 42,
      url: 'https://example.com/full.jpg',
      slideshow: 'w123'
    })
    expect(decodeActionHash(href)).toEqual({
      id: 42,
      url: 'https://example.com/full.jpg',
      slideshow: 'w123'
    })
  })

  it('decodes video payloads and survives utf-8 in the JSON', () => {
    const payload = { type: 'video', url: 'https://example.com/clip.mp4', title: 'Ünïcode — ok' }
    const href = `#${encodeURIComponent(
      `elementor-action:action=lightbox&settings=${btoa(
        String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload)))
      )}`
    )}`
    expect(decodeActionHash(href)).toEqual(payload)
  })

  it('returns null for other actions, garbage and non-hashes', () => {
    expect(decodeActionHash(actionHash('popup', { id: 7 }))).toBeNull()
    expect(decodeActionHash('#elementor-action%3Aaction%3Dlightbox%26settings%3D%%%')).toBeNull()
    expect(decodeActionHash('#some-anchor')).toBeNull()
    expect(decodeActionHash('https://example.com/a.jpg')).toBeNull()
    expect(decodeActionHash('')).toBeNull()
  })
})
