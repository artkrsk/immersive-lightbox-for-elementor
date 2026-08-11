// @vitest-environment happy-dom

import { findCandidates } from '@ts/collector/findCandidates'
import { describe, expect, it } from 'vitest'

describe('findCandidates', () => {
  it('selects only marked anchors and skips opted-out ones', () => {
    document.body.innerHTML = `
      <a href="/a.jpg" data-arts-lightbox><img src="a-t.jpg" alt="" /></a>
      <a href="/plain.jpg"><img src="p-t.jpg" alt="" /></a>
      <a href="/off.jpg" data-arts-lightbox data-arts-lightbox-off><img src="o-t.jpg" alt="" /></a>
      <div data-arts-lightbox-off>
        <a href="/nested-off.jpg" data-arts-lightbox><img src="n-t.jpg" alt="" /></a>
      </div>
    `
    const candidates = findCandidates(document)
    expect(candidates.length).toBe(1)
    expect(candidates[0]?.data.src).toContain('/a.jpg')
  })

  it('resolves the group id from the element or the closest group container', () => {
    document.body.innerHTML = `
      <a href="/own.jpg" data-arts-lightbox data-arts-lightbox-group="g-own"><img src="t.jpg" alt="" /></a>
      <div data-arts-lightbox-group="g-container">
        <a href="/inherited.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
      </div>
      <a href="/none.jpg" data-arts-lightbox><img src="t.jpg" alt="" /></a>
    `
    const [own, inherited, none] = findCandidates(document)
    expect(own?.groupId).toBe('g-own')
    expect(inherited?.groupId).toBe('g-container')
    expect(none?.groupId).toBeNull()
  })
})
