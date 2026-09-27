import { attachHoverPrefetch } from '../interaction/hoverPrefetch'
import type { ILightbox, ILightboxApi, ILightboxLifecycle, IOptions } from '../interfaces'
import type { TDeepPartial } from '../types'
import { audioFocus } from '../video/audioFocus'
import { attachDelegation } from './attachDelegation'
import { createNavigator } from './createNavigator'
import { createOpener } from './createOpener'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'

/** Composition root: options, the close route, the open path, navigation. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  return createLightboxWithLifecycle(options)
}

/** Internal boot composition; the public library constructor remains global-free. */
export function createLightboxWithLifecycle(
  options?: TDeepPartial<IOptions>,
  hooks?: ILightboxLifecycle
): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let detachDelegation: (() => void) | null = null
  let disposePrefetch: (() => void) | null = null
  let destroying = false
  let destroyed = false

  const close = (): Promise<void> => {
    // Sound never survives into the close choreography.
    audioFocus.releaseAll()
    return engineState.closeHandle?.close() ?? Promise.resolve()
  }

  const navigator = createNavigator()
  const api: ILightboxApi = {
    close: () => {
      void close()
    },
    next: () => {
      navigator.nav(1)
    },
    prev: () => {
      navigator.nav(-1)
    },
    goTo: (index) => {
      navigator.goTo(index)
    }
  }

  const opener = createOpener({ opts, api, close: api.close, publisher: hooks?.roots })

  const instance: ILightbox = {
    init: () => {
      if (detachDelegation || destroying) {
        return
      }
      destroyed = false
      detachDelegation = attachDelegation(
        {
          open: opener.open,
          close: api.close,
          next: api.next,
          prev: api.prev
        },
        opts.elementor.nativeFallback
      )
      disposePrefetch = attachHoverPrefetch(opts)
      hooks?.initialized(instance)
    },
    destroy: () => {
      if (destroying || destroyed) return
      destroying = true
      destroyed = true
      hooks?.destroying(instance)
      detachDelegation?.()
      detachDelegation = null
      disposePrefetch?.()
      disposePrefetch = null
      engineState.pswp?.destroy()
      destroying = false
    },
    close,
    open: opener.open,
    version: __ARTS_IMMERSIVE_LIGHTBOX_VERSION__
  }
  return instance
}
