// @vitest-environment happy-dom

import { CurtainMask, curvedEdgePath, straightInset } from '@ts/transition/curtainMask'
import { describe, expect, it, vi } from 'vitest'

function createHost() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return host
}

describe('CurtainMask (curved)', () => {
  it('injects one clipPath defs block into the host at construction', () => {
    const host = createHost()
    new CurtainMask({ host, id: 'test-clip' })
    const svg = host.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    const clipPath = svg?.querySelector('clipPath')
    expect(clipPath?.getAttribute('id')).toBe('test-clip')
    expect(clipPath?.getAttribute('clipPathUnits')).toBe('objectBoundingBox')
    expect(clipPath?.querySelector('path')).not.toBeNull()
  })

  it('attach assigns the url() clip; setProgress mutates the path d', () => {
    const host = createHost()
    const mask = new CurtainMask({ host, id: 'test-clip' })
    const el = document.createElement('div')
    mask.attach(el)
    expect(el.style.clipPath).toContain('test-clip')
    mask.setProgress(0.4, 0.05)
    const path = host.querySelector('path')
    expect(path?.getAttribute('d')).toBe(curvedEdgePath(0.4, 0.05, 'right'))
  })

  it('dirty-checks repeat paints; setDirection invalidates the cache', () => {
    const host = createHost()
    const mask = new CurtainMask({ host, id: 'test-clip' })
    const path = host.querySelector('path') as SVGPathElement
    const spy = vi.spyOn(path, 'setAttribute')
    mask.setProgress(0.4, 0.05)
    mask.setProgress(0.4, 0.05)
    expect(spy).toHaveBeenCalledTimes(1)
    mask.setDirection('top')
    mask.setProgress(0.4, 0.05)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(path.getAttribute('d')).toBe(curvedEdgePath(0.4, 0.05, 'top'))
  })

  it('detach clears the clip; re-attach targets another element', () => {
    const host = createHost()
    const mask = new CurtainMask({ host, id: 'test-clip' })
    const a = document.createElement('div')
    const b = document.createElement('div')
    mask.attach(a)
    mask.detach()
    expect(a.style.clipPath).toBe('')
    mask.attach(b)
    expect(b.style.clipPath).toContain('test-clip')
  })

  it('revert detaches and removes the injected defs', () => {
    const host = createHost()
    const mask = new CurtainMask({ host, id: 'test-clip' })
    const el = document.createElement('div')
    mask.attach(el)
    mask.revert()
    expect(el.style.clipPath).toBe('')
    expect(host.querySelector('svg')).toBeNull()
  })
})

describe('CurtainMask (straight)', () => {
  it('setProgress writes the inset onto the attached element', () => {
    const host = createHost()
    const mask = new CurtainMask({
      host,
      id: 'test-clip',
      edgeStyle: 'straight',
      direction: 'bottom'
    })
    const el = document.createElement('div')
    mask.attach(el)
    mask.setProgress(0.4)
    expect(el.style.clipPath).toBe(straightInset(0.4, 'bottom'))
    mask.detach()
    expect(el.style.clipPath).toBe('')
  })
})
