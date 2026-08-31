// @vitest-environment happy-dom

import { measureAdminBarOffset } from '@ts/utils/measureAdminBarOffset'
import { beforeEach, describe, expect, it } from 'vitest'

// happy-dom performs no layout — the bar's rect is stubbed, and the tests
// assert our reading of it: absence, clamping, rounding.
function addBar(bottom: number): void {
  const bar = document.createElement('div')
  bar.id = 'wpadminbar'
  bar.getBoundingClientRect = () =>
    ({ bottom, top: bottom - 32, left: 0, right: 800, width: 800, height: 32 }) as DOMRect
  document.body.appendChild(bar)
}

describe('measureAdminBarOffset', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('reads 0 when no bar exists (visitors, editor preview)', () => {
    expect(measureAdminBarOffset()).toBe(0)
  })

  it('reads the bar bottom as the viewport overlap', () => {
    addBar(32)
    expect(measureAdminBarOffset()).toBe(32)
  })

  it('clamps a scrolled-away absolute bar to 0', () => {
    // Below 600px core makes the bar position: absolute — scrolled down, its
    // rect sits above the viewport and no room must be reserved.
    addBar(-14)
    expect(measureAdminBarOffset()).toBe(0)
  })

  it('rounds fractional overlap to whole pixels', () => {
    addBar(31.5)
    expect(measureAdminBarOffset()).toBe(32)
  })
})
