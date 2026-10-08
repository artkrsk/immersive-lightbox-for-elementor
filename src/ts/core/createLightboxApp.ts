import { markCandidates } from '../collector/markCandidates'
import type { ILightbox } from '../interfaces/ILightbox'
import type { ILightboxApp } from '../interfaces/ILightboxApp'
import type { ILightboxAppOptions } from '../interfaces/ILightboxAppOptions'
import { createLightboxWithLifecycle } from './createLightbox'
import { getLightboxGlobal } from './lightboxGlobal'
import { openFromHash } from './openFromHash'

export function createLightboxApp({ options, signal }: ILightboxAppOptions = {}): ILightboxApp {
  const lifetime = new AbortController()
  let started = false
  let instance: ILightbox | null = null
  let release: (() => void) | undefined
  const destroy = (): void => {
    if (lifetime.signal.aborted) {
      return
    }
    lifetime.abort()
    signal?.removeEventListener('abort', destroy)
    instance?.destroy()
    instance = null
    release?.()
  }
  return {
    get: () => instance,
    destroy,
    init() {
      if (started || lifetime.signal.aborted || signal?.aborted) {
        return
      }
      started = true
      signal?.addEventListener('abort', destroy, { once: true })
      const hub = getLightboxGlobal(window)
      hub.__replaceBoot(() => {
        if (lifetime.signal.aborted) {
          return
        }
        hub.__disposeBoot = destroy
        hub.refresh = () => {
          markCandidates(options?.elementor?.nativeFallback === true)
        }
        delete hub.preload
        release = () => {
          if (hub.__disposeBoot === destroy) {
            delete hub.__disposeBoot
            hub.refresh = () => {}
          }
        }
        const boot = (): void => {
          if (lifetime.signal.aborted || instance) {
            return
          }
          instance = createLightboxWithLifecycle(options, {
            roots: hub.__roots,
            initialized(lightbox) {
              if (hub.__disposeBoot === destroy && !lifetime.signal.aborted) {
                hub.__setInstance(lightbox)
              }
            },
            destroying(lightbox) {
              if (hub.__disposeBoot === destroy && hub.get() === lightbox) {
                hub.__setInstance(null)
              }
            }
          })
          instance.init()
          if (lifetime.signal.aborted || hub.get() !== instance) {
            return
          }
          document.dispatchEvent(new CustomEvent('arts-lightbox:ready', { detail: instance }))
          if (!lifetime.signal.aborted && hub.get() === instance) {
            openFromHash(instance)
          }
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', boot, {
            once: true,
            signal: lifetime.signal
          })
        } else {
          boot()
        }
      }, lifetime.signal)
    }
  }
}
