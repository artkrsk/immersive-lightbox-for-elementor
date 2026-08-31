// @vitest-environment happy-dom

import { paintCoverlessFade } from '@ts/transition/paintCoverlessFade'
import { beforeEach, describe, expect, it } from 'vitest'

const linear = (t: number): number => t
/** A recognizably curved ease, so a bent curve is distinguishable from a short one. */
const quad = (t: number): number => t * t

let el: HTMLElement

beforeEach(() => {
  el = document.createElement('div')
})

const paint = (raw: number, ease = linear) => {
  paintCoverlessFade(el, raw, ease)
  return { opacity: Number(el.style.opacity), lift: el.style.translate }
}

describe('paintCoverlessFade', () => {
  it('starts present and in place', () => {
    expect(paint(0)).toEqual({ opacity: 1, lift: '0 0.00px' })
  })

  it('clears and sinks together, finishing at the halfway point', () => {
    expect(paint(0.25)).toEqual({ opacity: 0.5, lift: '0 10.00px' })
    expect(paint(0.5)).toEqual({ opacity: 0, lift: '0 20.00px' })
  })

  it('holds both at the end state for the rest of the clock', () => {
    // The clamp matters: without it the second half would drive opacity
    // negative and keep pushing the content down, while the veil still has
    // half a transition to run.
    expect(paint(0.75)).toEqual({ opacity: 0, lift: '0 20.00px' })
    expect(paint(1)).toEqual({ opacity: 0, lift: '0 20.00px' })
  })

  it('shortens the curve instead of bending it', () => {
    // The design decision, locked: compress RAW progress and re-ease. Scaling
    // the eased value would give 1 - 2*quad(0.25) = 0.875 here — a different
    // curve, not the same one at double speed.
    expect(paint(0.25, quad)).toEqual({ opacity: 1 - quad(0.5), lift: '0 5.00px' })
  })

  it('reverses into a rise-and-fade over the back half', () => {
    // The open passes `1 - raw`: held below and invisible while the veil
    // establishes the stage, arriving exactly as the clock ends.
    const open = (raw: number) => paint(1 - raw)
    expect(open(0)).toEqual({ opacity: 0, lift: '0 20.00px' })
    expect(open(0.5)).toEqual({ opacity: 0, lift: '0 20.00px' })
    expect(open(0.75)).toEqual({ opacity: 0.5, lift: '0 10.00px' })
    // Exactly in place at the end, so the open hands the container back to
    // the stylesheet with no step.
    expect(open(1)).toEqual({ opacity: 1, lift: '0 0.00px' })
  })

  it('writes the offset where the main scroll will not overwrite it', () => {
    // PhotoSwipe owns the container's `transform` — that is how it moves
    // between slides. The individual property composes instead of fighting.
    paintCoverlessFade(el, 0.25, linear)
    expect(el.style.transform).toBe('')
    expect(el.style.translate).toBe('0 10.00px')
  })
})
