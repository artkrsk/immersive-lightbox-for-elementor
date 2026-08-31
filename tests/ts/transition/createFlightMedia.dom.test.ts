// @vitest-environment happy-dom

import { createFlightMedia } from '@ts/transition/createFlightMedia'
import { describe, expect, it } from 'vitest'

describe('createFlightMedia', () => {
  it('builds an img clone from a src', () => {
    const el = createFlightMedia({ src: 'https://x.test/a.jpg' })
    expect(el).toBeInstanceOf(HTMLImageElement)
    expect((el as HTMLImageElement).src).toBe('https://x.test/a.jpg')
  })

  it('gives the clone an empty alt — it is decorative during the flight', () => {
    const el = createFlightMedia({ src: 'https://x.test/a.jpg' })
    expect((el as HTMLImageElement).alt).toBe('')
  })
})
