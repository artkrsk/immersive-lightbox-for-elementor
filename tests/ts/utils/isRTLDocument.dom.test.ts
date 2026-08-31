// @vitest-environment happy-dom

import { isRTLDocument } from '@ts/utils/isRTLDocument'
import { afterEach, describe, expect, it } from 'vitest'

describe('isRTLDocument', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('style')
  })

  it('is false on a default document', () => {
    expect(isRTLDocument()).toBe(false)
  })

  it('is true when the root reads right-to-left', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    expect(isRTLDocument()).toBe(true)
  })

  it('reads the computed value, so CSS-set direction counts too', () => {
    document.documentElement.style.direction = 'rtl'
    expect(isRTLDocument()).toBe(true)
  })

  it('is false again once the document goes back to ltr', () => {
    document.documentElement.setAttribute('dir', 'ltr')
    expect(isRTLDocument()).toBe(false)
  })
})
