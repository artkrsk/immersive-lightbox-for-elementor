// @vitest-environment happy-dom

import { mergeOptions } from '@ts/core/mergeOptions'
import { createBackdrop } from '@ts/transition/backdrop'
import { bellBow, curvedEdgePath, straightInset } from '@ts/transition/curtainMask'
import { describe, expect, it } from 'vitest'

describe('createBackdrop', () => {
  it('curtain preset builds a mask and opens at backdropOpacity', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'curtain' }, ui: { backdropOpacity: 0.6 } })
    createBackdrop(root, opts)
    const el = root.querySelector('.arts-lightbox-backdrop') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.style.opacity).toBe('0.6')
    expect(root.querySelector('svg')).not.toBeNull()
  })

  it('non-curtain preset opens transparent with no mask', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'fade' } })
    createBackdrop(root, opts)
    const el = root.querySelector('.arts-lightbox-backdrop') as HTMLElement
    expect(el.style.opacity).toBe('0')
    expect(root.querySelector('svg')).toBeNull()
  })

  it('paint() drives the curtain mask, signed by close direction', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'curtain', edge: 'curved', bow: 0.2 } })
    const backdrop = createBackdrop(root, opts)
    const path = root.querySelector('path') as SVGPathElement

    backdrop.paint(0.3, false)
    expect(path.getAttribute('d')).toBe(curvedEdgePath(0.3, bellBow(0.3, 0.2), 'bottom'))

    backdrop.paint(0.7, true)
    expect(path.getAttribute('d')).toBe(curvedEdgePath(0.7, -bellBow(0.7, 0.2), 'bottom'))
  })

  it('paint() writes an inset clip for the default straight edge', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'curtain' } })
    const backdrop = createBackdrop(root, opts)
    const el = root.querySelector('.arts-lightbox-backdrop') as HTMLElement

    backdrop.paint(0.4, false)
    expect(root.querySelector('path')?.getAttribute('d')).toBeNull()
    expect(el.style.clipPath).toBe(straightInset(0.4, 'bottom'))
  })

  it('paint() without a mask drives opacity from t * backdropOpacity', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'fade' }, ui: { backdropOpacity: 0.8 } })
    const backdrop = createBackdrop(root, opts)
    const el = root.querySelector('.arts-lightbox-backdrop') as HTMLElement

    backdrop.paint(0.5, false)
    expect(el.style.opacity).toBe(String(0.5 * 0.8))
  })

  it('beginClose flips the curtain to exit out the top when close is "through"', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({
      transition: { preset: 'curtain', edge: 'curved', close: 'through', bow: 0.2 }
    })
    const backdrop = createBackdrop(root, opts)
    const path = root.querySelector('path') as SVGPathElement

    backdrop.paint(0.3, false)
    backdrop.beginClose()
    backdrop.paint(0.3, false)
    expect(path.getAttribute('d')).toBe(curvedEdgePath(0.3, bellBow(0.3, 0.2), 'top'))
  })

  it('beginClose is a no-op for other close directions', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({
      transition: { preset: 'curtain', edge: 'curved', close: 'reverse', bow: 0.2 }
    })
    const backdrop = createBackdrop(root, opts)
    const path = root.querySelector('path') as SVGPathElement

    backdrop.paint(0.3, false)
    backdrop.beginClose()
    backdrop.paint(0.6, false)
    expect(path.getAttribute('d')).toBe(curvedEdgePath(0.6, bellBow(0.6, 0.2), 'bottom'))
  })

  it('beginClose does not throw without a mask', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'fade' } })
    const backdrop = createBackdrop(root, opts)
    expect(() => {
      backdrop.beginClose()
    }).not.toThrow()
  })

  it('destroy reverts the mask and removes the element', () => {
    const root = document.createElement('div')
    const opts = mergeOptions({ transition: { preset: 'curtain' } })
    const backdrop = createBackdrop(root, opts)
    backdrop.destroy()
    expect(root.querySelector('.arts-lightbox-backdrop')).toBeNull()
    expect(root.querySelector('svg')).toBeNull()
  })
})
