// @vitest-environment happy-dom

import { EVENT_CHANGE, EVENT_DESTROY, EVENT_OPEN } from '@ts/constants/eventNames'
import { attachLightboxEvents } from '@ts/core/attachLightboxEvents'
import type { IGallery } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fakePswp } from '../helpers/fakePswp'

function fakeGallery(): IGallery {
  return {
    id: 'g',
    slides: [
      { key: 'a', type: 'image', src: 'a.jpg', caption: 'First', description: 'Of three' },
      { key: 'b', type: 'video', src: 'b.mp4' },
      { key: 'c', type: 'html', src: '#', caption: 'Third' }
    ],
    elementsByKey: new Map()
  } as IGallery
}

let abort = new AbortController()

function collect(name: string): CustomEvent[] {
  const seen: CustomEvent[] = []
  document.addEventListener(
    name,
    (e) => {
      seen.push(e as CustomEvent)
    },
    { signal: abort.signal }
  )
  return seen
}

function attached(rootId = '') {
  const pswp = fakePswp()
  const root = document.createElement('div')
  root.id = rootId
  pswp.element = root
  attachLightboxEvents(pswp as unknown as PhotoSwipe, fakeGallery())
  return pswp
}

beforeEach(() => {
  abort = new AbortController()
})

afterEach(() => {
  abort.abort()
})

describe('attachLightboxEvents', () => {
  it('emits open on afterInit with the full primitive detail', () => {
    const seen = collect(EVENT_OPEN)
    const pswp = attached()

    pswp.emit('afterInit', {})

    expect(seen).toHaveLength(1)
    expect(seen[0]?.detail).toEqual({
      root: pswp.element,
      index: 0,
      total: 3,
      caption: 'First',
      description: 'Of three',
      type: 'image'
    })
  })

  it('stays silent for the init-time change — open already carries the index', () => {
    const seen = collect(EVENT_CHANGE)
    const pswp = attached()

    pswp.emit('change', {})
    pswp.emit('afterInit', {})
    pswp.emit('change', {})

    expect(seen).toHaveLength(0)
  })

  it('emits change at commit — the destination, while currIndex still lags', () => {
    const seen = collect(EVENT_CHANGE)
    const pswp = attached()
    pswp.emit('afterInit', {})

    // moveIndexBy writes potentialIndex and announces; currIndex only lands
    // in updateCurrItem at spring completion.
    pswp.potentialIndex = 1
    pswp.emit('potentialIndexChange', { direction: 1 })

    expect(pswp.currIndex).toBe(0)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.detail).toEqual({
      root: pswp.element,
      index: 1,
      total: 3,
      caption: '',
      description: '',
      type: 'video',
      previousIndex: 0,
      direction: 1
    })
  })

  it('reports the travel direction, not the index delta — a loop wrap goes forward', () => {
    const seen = collect(EVENT_CHANGE)
    const pswp = attached()
    pswp.currIndex = 2
    pswp.potentialIndex = 2
    pswp.emit('afterInit', {})

    pswp.potentialIndex = 0
    pswp.emit('potentialIndexChange', { direction: 1 })

    expect(seen[0]?.detail).toMatchObject({ previousIndex: 2, index: 0, direction: 1 })
  })

  it('adds nothing when the strip comes to rest — change already went out at commit', () => {
    const seen = collect(EVENT_CHANGE)
    const pswp = attached()
    pswp.emit('afterInit', {})

    pswp.potentialIndex = 1
    pswp.emit('potentialIndexChange', { direction: 1 })
    pswp.currIndex = 1
    pswp.emit('change', {})

    expect(seen).toHaveLength(1)
  })

  it('emits destroy on pswp close, carrying only the root', () => {
    // pswp `close`, not pswp `destroy`: the fork defers actual teardown a
    // beat, and in this engine every close leads to destroy — announcing at
    // the intent keeps the wire order honest (see the pass-through test).
    const seen = collect(EVENT_DESTROY)
    const pswp = attached()
    pswp.emit('afterInit', {})

    pswp.emit('close', {})
    pswp.emit('destroy', {})

    expect(seen).toHaveLength(1)
    expect(seen[0]?.detail).toEqual({ root: pswp.element })
  })

  it('pass-through reaches a theme as destroy-then-open, never interleaved', () => {
    // The navigator destroys the old core before opening the neighbor, but
    // the fork's destroy() defers its `destroy` event past the new core's
    // init. `close` is the synchronous intent — this replays the real
    // sequence and pins the wire order a theme may rely on.
    const order: string[] = []
    for (const name of [EVENT_OPEN, EVENT_DESTROY]) {
      document.addEventListener(
        name,
        (e) => {
          order.push(
            `${name.replace('arts-lightbox:', '')}:${((e as CustomEvent).detail.root as HTMLElement).id}`
          )
        },
        { signal: abort.signal }
      )
    }
    const first = attached('first')
    first.emit('afterInit', {})

    first.emit('close', {})
    const second = attached('second')
    second.emit('afterInit', {})
    first.emit('destroy', {})

    expect(order).toEqual(['open:first', 'destroy:first', 'open:second'])
  })
})
