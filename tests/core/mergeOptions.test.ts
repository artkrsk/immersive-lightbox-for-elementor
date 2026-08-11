import { DEFAULT_OPTIONS } from '@ts/constants'
import { mergeOptions } from '@ts/core/mergeOptions'
import { describe, expect, it } from 'vitest'

describe('mergeOptions', () => {
  it('returns the defaults when called with nothing', () => {
    expect(mergeOptions()).toEqual(DEFAULT_OPTIONS)
  })

  it('deep-merges nested partials, keeping sibling keys', () => {
    const merged = mergeOptions({ transition: { duration: 1200 } })
    expect(merged.transition.duration).toBe(1200)
    expect(merged.transition.easing).toBe('power2.inOut')
    expect(merged.transition.preset).toBe('curtain')
    expect(merged.ui.counter).toBe(true)
  })

  it('does not mutate DEFAULT_OPTIONS', () => {
    mergeOptions({ transition: { duration: 999 }, ui: { thumbnails: true } })
    expect(DEFAULT_OPTIONS.transition.duration).toBe(800)
    expect(DEFAULT_OPTIONS.ui.thumbnails).toBe(false)
  })
})
