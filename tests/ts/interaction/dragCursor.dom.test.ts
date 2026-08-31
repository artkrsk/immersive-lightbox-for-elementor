// @vitest-environment happy-dom

import { DEFAULT_OPTIONS } from '@ts/constants'
import { attachDragCursor } from '@ts/interaction/dragCursor'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

const PRESSING = 'arts-lightbox-pressing'
const DRAGGABLE = 'arts-lightbox-draggable'

function setup(over: { items?: number; desktopDrag?: boolean } = {}) {
  const pswp = Object.assign(fakePswp(), { getNumItems: () => over.items ?? 4 })
  const opts = {
    ...DEFAULT_OPTIONS,
    desktopDrag: over.desktopDrag ?? DEFAULT_OPTIONS.desktopDrag
  }
  // Interactions attach BEFORE init, when the root does not exist yet — so
  // the root is only handed over on the lifecycle event, as in the engine.
  attachDragCursor(pswp as unknown as PhotoSwipe, opts)
  pswp.element = document.createElement('div')
  pswp.emit('afterInit', {})
  return pswp
}

describe('attachDragCursor', () => {
  it('marks the root while a press is held', () => {
    // The fork ships no dragging state of its own — only `pswp--has_mouse` —
    // so the grab cursor has nothing to key on without this.
    const pswp = setup()
    expect(pswp.element?.className).not.toContain(PRESSING)

    pswp.emit('pointerDown', {})
    expect(pswp.element?.className).toContain(PRESSING)

    pswp.emit('pointerUp', {})
    expect(pswp.element?.className).not.toContain(PRESSING)
  })

  it('marks the root draggable only where a drag leads somewhere', () => {
    // The grab cursor is a promise: with one slide, or with desktop drag
    // turned off, there is nowhere to drag to and it would be a lie.
    expect(setup({ items: 4 }).element?.className).toContain(DRAGGABLE)
    expect(setup({ items: 1 }).element?.className).not.toContain(DRAGGABLE)
    expect(setup({ desktopDrag: false }).element?.className).not.toContain(DRAGGABLE)
  })

  it('lets go when the gesture is taken away mid-press', () => {
    // A pointer captured by something else never reports its release; the
    // cursor would stay grabbing over a lightbox nobody is dragging.
    const pswp = setup()
    pswp.emit('pointerDown', {})
    pswp.emit('destroy', {})
    expect(pswp.element?.className).not.toContain(PRESSING)
  })
})
