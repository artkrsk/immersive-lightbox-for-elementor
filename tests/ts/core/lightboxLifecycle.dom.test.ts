// @vitest-environment happy-dom
import { createLightboxWithLifecycle } from '@ts/core/createLightbox'
import { engineState } from '@ts/core/engineState'
import { getLightboxGlobal } from '@ts/core/lightboxGlobal'
import { afterEach, expect, it, vi } from 'vitest'
import { installFrameClock } from '../helpers/frameClock'

afterEach(() => {
  engineState.pswp?.destroy()
  vi.runAllTimers()
  vi.useRealTimers()
  delete window.artsLightbox
  document.body.replaceChildren()
})

function fixture() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const frames = installFrameClock()
  const hub = getLightboxGlobal(window)
  const lightbox = createLightboxWithLifecycle(undefined, {
    roots: hub.__roots,
    initialized: (instance) => hub.__setInstance(instance),
    destroying: () => hub.__setInstance(null),
    isActive: () => true
  })
  const sourceElement = document.createElement('a')
  sourceElement.href = 'https://example.com/photo.jpg'
  sourceElement.setAttribute('data-arts-lightbox', '')
  sourceElement.setAttribute('data-arts-lightbox-width', '400')
  sourceElement.setAttribute('data-arts-lightbox-height', '300')
  document.body.append(sourceElement)
  lightbox.init()
  return { frames, hub, lightbox, sourceElement }
}

it('keeps the root observable for the whole normal closing animation', async () => {
  const { frames, hub, lightbox, sourceElement } = fixture()
  const seen = vi.fn()
  hub.observeRoots(seen)
  lightbox.open(sourceElement)
  const opened = seen.mock.lastCall?.[0]
  expect(opened).toHaveLength(1)
  expect(opened[0].sourceElement).toBe(sourceElement)
  for (let i = 0; i < 8; i++) frames.step(200)
  const closing = lightbox.close()
  expect(seen.mock.lastCall?.[0]).toBe(opened)
  for (let i = 0; i < 14; i++) frames.step(200)
  await closing
  expect(seen.mock.lastCall?.[0]).toEqual([])
  vi.runAllTimers()
  lightbox.destroy()
})

it('can destroy from the first snapshot without starting a zombie opening or stranding close', async () => {
  const { frames, hub, lightbox, sourceElement } = fixture()
  let closing: Promise<void> | undefined
  hub.observeRoots((roots) => {
    if (!roots.length) return
    closing = lightbox.close()
    lightbox.destroy()
  })
  const seen = vi.fn()
  hub.observeRoots(seen)
  expect(lightbox.open(sourceElement)).toBe(true)
  expect(seen.mock.lastCall?.[0]).toEqual([])
  expect(frames.pending()).toBe(0)
  vi.runAllTimers()
  await expect(closing).resolves.toBeUndefined()
})
