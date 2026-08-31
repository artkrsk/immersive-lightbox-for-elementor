import { shortestDelta } from '@ts/utils/shortestDelta'
import { describe, expect, it } from 'vitest'

describe('shortestDelta', () => {
  it('takes the forward path when it is the shorter way around', () => {
    expect(shortestDelta(0, 3, 10)).toBe(3)
  })

  it('takes the backward path when forward would be the long way around', () => {
    expect(shortestDelta(0, 8, 10)).toBe(-2)
  })

  it('stays forward at exactly half the ring', () => {
    expect(shortestDelta(0, 5, 10)).toBe(5)
  })
})
