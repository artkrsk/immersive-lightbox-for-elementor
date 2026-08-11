import { createLightbox } from '@ts/core/createLightbox'
import { describe, expect, it } from 'vitest'

describe('createLightbox', () => {
  it('returns a lightbox instance with the public surface', () => {
    const lightbox = createLightbox()
    expect(typeof lightbox.init).toBe('function')
    expect(typeof lightbox.destroy).toBe('function')
    expect(typeof lightbox.open).toBe('function')
    expect(lightbox.version).toBe('0.0.0-test')
  })
})
