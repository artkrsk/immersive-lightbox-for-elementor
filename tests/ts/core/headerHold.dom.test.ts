// @vitest-environment happy-dom

import { holdHeader, releaseHeader } from '@ts/core/headerHold'
import { beforeEach, describe, expect, it } from 'vitest'

// The literals, deliberately not imported: this is a wire contract with
// another plugin, so a rename has to fail here rather than pass by agreeing
// with itself.
const ATTR = 'data-arts-header-hide-over'
const MODE = 'in-view'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('headerHold', () => {
  it('stamps the zone their engine reads, in the mode that spans the screen', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    holdHeader(root)

    expect(root.getAttribute(ATTR)).toBe(MODE)
  })

  it('releases by removing it, not by blanking it', () => {
    // An empty value still matches `[data-arts-header-hide-over]` and parses
    // back to their `at-top` default, so the zone would stay live.
    const root = document.createElement('div')
    document.body.appendChild(root)
    holdHeader(root)

    releaseHeader(root)

    expect(root.hasAttribute(ATTR)).toBe(false)
  })

  it('releases what a mutation observer on the body can actually see', async () => {
    // Their tracker observes the body subtree for this attribute. The release
    // has to happen while the root is still attached — this asserts the
    // mutation is observable, which is the whole reason it rides `close`
    // rather than `destroy`.
    const root = document.createElement('div')
    document.body.appendChild(root)
    holdHeader(root)

    const seen: string[] = []
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        seen.push(String(record.attributeName))
      }
    })
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: [ATTR] })

    releaseHeader(root)
    await Promise.resolve()
    observer.disconnect()

    expect(seen).toContain(ATTR)
  })

  it('is inert on a root that never held it', () => {
    const root = document.createElement('div')
    expect(() => {
      releaseHeader(root)
    }).not.toThrow()
  })
})
