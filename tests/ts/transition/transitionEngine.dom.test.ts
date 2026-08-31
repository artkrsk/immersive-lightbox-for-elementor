// @vitest-environment happy-dom

import { CLOSING_CLASS } from '@ts/constants'
import type { IOpenRequest, IOptions } from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import { attachOpenTransition } from '@ts/transition/transitionEngine'
import { beforeEach, describe, expect, it } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'
import { giveRect, transitionContext } from '../helpers/transitionContext'

let frames: ReturnType<typeof installFrameClock>

beforeEach(() => {
  document.body.innerHTML = ''
  frames = installFrameClock()
})

/**
 * A core the engine can wire onto: it only ever calls `.on()` for two events,
 * so the fake records handlers and the test fires them in the order the real
 * fork would.
 */
function engine(o: { flyable?: boolean } = {}) {
  const built = transitionContext()
  const handlers = new Map<string, () => void>()
  const pswp = {
    ...(built.ctx.pswp as unknown as Record<string, unknown>),
    on: (name: string, fn: () => void) => handlers.set(name, fn)
  }
  if (o.flyable) {
    const img = document.createElement('img')
    built.sourceElement.appendChild(img)
    giveRect(built.sourceElement)
    giveRect(img)
  }
  const handle = attachOpenTransition(
    pswp as unknown as PhotoSwipe,
    built.ctx.opts as IOptions,
    built.ctx.req as IOpenRequest
  )
  return {
    handle,
    fire: (name: string) => handlers.get(name)?.(),
    root: built.root
  }
}

/** Run the open clock to completion so `transitioning` flips false. */
function settleOpen(): void {
  for (let i = 0; i < 5; i++) {
    frames.step(200)
  }
}

/** Same for the close clock, plus the frames a landing flight asks for. */
function settleClose(): void {
  for (let i = 0; i < 12; i++) {
    frames.step(200)
  }
}

describe('attachOpenTransition', () => {
  it('reports transitioning from the moment it is attached', () => {
    const { handle } = engine()

    expect(handle.isTransitioning()).toBe(true)
  })

  it('holds a close requested mid-open until the open settles', async () => {
    const { handle, fire, root } = engine()
    fire('firstUpdate')
    fire('afterInit')

    const done = handle.close()

    // The open owns the stage until it settles — but the request is kept,
    // not dropped: a page transition asking to close must always be answered.
    expect(root.classList.contains(CLOSING_CLASS)).toBe(false)

    settleOpen()
    await Promise.resolve()

    expect(root.classList.contains(CLOSING_CLASS)).toBe(true)

    settleClose()
    await expect(done).resolves.toBeUndefined()
  })

  it('stops transitioning only once the open choreography settles', () => {
    const { handle, fire } = engine()
    fire('firstUpdate')
    fire('afterInit')
    expect(handle.isTransitioning()).toBe(true)

    settleOpen()

    expect(handle.isTransitioning()).toBe(false)
  })

  it('mounts the chrome on firstUpdate, before the open runs', () => {
    const { fire, root } = engine()

    fire('firstUpdate')

    expect(root.style.getPropertyValue('--arts-lightbox-chrome')).toBe('0')
  })

  it('closes once the open has settled', () => {
    const { handle, fire, root } = engine()
    fire('firstUpdate')
    fire('afterInit')
    settleOpen()

    void handle.close()

    expect(handle.isTransitioning()).toBe(true)
    expect(root.classList.contains(CLOSING_CLASS)).toBe(true)
  })

  it('joins the close already running, so a double-tap runs one teardown', async () => {
    const { handle, fire } = engine({ flyable: true })
    fire('firstUpdate')
    fire('afterInit')
    settleOpen()

    const first = handle.close()
    const second = handle.close()

    // The same promise, not a resolved stand-in: a consumer awaiting the
    // second call still learns when the lightbox is actually gone.
    expect(second).toBe(first)

    settleClose()
    await expect(second).resolves.toBeUndefined()
    expect(handle.isTransitioning()).toBe(true)
  })

  it('keeps reporting transitioning after a close, never resetting to idle', async () => {
    const { handle, fire } = engine()
    fire('firstUpdate')
    fire('afterInit')
    settleOpen()

    const done = handle.close()
    settleClose()
    await done

    expect(handle.isTransitioning()).toBe(true)
  })
})
