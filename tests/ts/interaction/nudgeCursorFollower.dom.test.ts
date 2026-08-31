// @vitest-environment happy-dom

import { nudgeCursorFollower } from '@ts/interaction/nudgeCursorFollower'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** Another plugin's global — stubbed through a cast rather than declared,
 * since our type surface has no business claiming it. */
function stubFollower(value: unknown): void {
  ;(window as unknown as { artsCursor?: unknown }).artsCursor = value
}

afterEach(() => {
  Reflect.deleteProperty(window, 'artsCursor')
})

describe('nudgeCursorFollower', () => {
  it('asks the follower to re-resolve what the pointer is on', () => {
    const refresh = vi.fn()
    stubFollower({ get: () => ({ refresh }) })

    nudgeCursorFollower()

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('says nothing when the plugin is absent', () => {
    expect(() => nudgeCursorFollower()).not.toThrow()
  })

  it('survives a build too old to know the method', () => {
    // Duck-typed on purpose: the two plugins version independently, and a
    // missing method must cost the affordance nothing but its freshness.
    stubFollower({ get: () => ({}) })
    expect(() => nudgeCursorFollower()).not.toThrow()
  })

  it('survives a follower that has not booted yet', () => {
    stubFollower({ get: () => null })
    expect(() => nudgeCursorFollower()).not.toThrow()
  })
})
