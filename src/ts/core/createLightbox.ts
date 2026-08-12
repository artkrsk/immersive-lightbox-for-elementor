import { attachHoverPrefetch } from '../interaction/hoverPrefetch'
import type { ILightbox, ILightboxApi, IOptions } from '../interfaces'
import type { TDeepPartial } from '../types'
import { audioFocus } from '../video/audioFocus'
import { attachDelegation } from './attachDelegation'
import { createNavigator } from './createNavigator'
import { createOpener } from './createOpener'
import { engineState } from './engineState'
import { mergeOptions } from './mergeOptions'

/** Composition root: options, the close route, the open path, navigation. */
export function createLightbox(options?: TDeepPartial<IOptions>): ILightbox {
  const opts: IOptions = mergeOptions(options)
  let detachDelegation: (() => void) | null = null
  let disposePrefetch: (() => void) | null = null

  const close = (): void => {
    // Sound never survives into the close choreography.
    audioFocus.releaseAll()
    void engineState.closeHandle?.close()
  }

  // The opener needs the api to hand to the UI layer, and the navigator needs
  // the opener — so the api delegates to a navigator assigned just below. Its
  // methods only run on user input, long after that.
  let navigator: ReturnType<typeof createNavigator>
  const api: ILightboxApi = {
    close,
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

  const opener = createOpener({ opts, api, close })
  navigator = createNavigator({
    opts,
    getCurrent: opener.getCurrent,
    openInstant: opener.openInstant
  })

  return {
    init: () => {
      if (detachDelegation) {
        return
      }
      detachDelegation = attachDelegation({
        open: opener.open,
        close,
        next: api.next,
        prev: api.prev
      })
      disposePrefetch = attachHoverPrefetch(opts)
    },
    destroy: () => {
      detachDelegation?.()
      detachDelegation = null
      disposePrefetch?.()
      disposePrefetch = null
      engineState.pswp?.destroy()
    },
    open: opener.open,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__
  }
}
