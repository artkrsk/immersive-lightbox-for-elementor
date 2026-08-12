// @vitest-environment happy-dom

import { createFlightMedia } from '@ts/transition/createFlightMedia'
import { describe, expect, it } from 'vitest'

describe('createFlightMedia', () => {
  it('builds an owned img clone from a src', () => {
    const { el, owned } = createFlightMedia({ kind: 'img', src: 'https://x.test/a.jpg' })
    expect(el).toBeInstanceOf(HTMLImageElement)
    expect((el as HTMLImageElement).src).toBe('https://x.test/a.jpg')
    expect(owned).toBe(true)
  })

  it('gives the clone an empty alt — it is decorative during the flight', () => {
    const { el } = createFlightMedia({ kind: 'img', src: 'https://x.test/a.jpg' })
    expect((el as HTMLImageElement).alt).toBe('')
  })

  it('borrows a live element by identity, never cloning it', () => {
    const live = document.createElement('video')
    const { el, owned } = createFlightMedia({ kind: 'element', el: live })
    expect(el).toBe(live)
    expect(owned).toBe(false)
  })
})
