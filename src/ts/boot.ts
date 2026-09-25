/** WordPress boot, retaining the gate's observable namespace across replacements. */
import { markCandidates } from './collector/markCandidates'
import { createLightboxWithLifecycle } from './core/createLightbox'
import { getLightboxGlobal } from './core/lightboxGlobal'
import { openFromHash } from './core/openFromHash'
import type { ILightbox } from './interfaces'

const hub = getLightboxGlobal(window)
hub.__replaceBoot(() => {
  const lifetime = new AbortController()
  let instance: ILightbox | null = null
  const dispose = () => {
    if (lifetime.signal.aborted) return
    lifetime.abort()
    instance?.destroy()
    instance = null
    if (hub.__disposeBoot === dispose) delete hub.__disposeBoot
  }
  hub.__disposeBoot = dispose
  hub.refresh = () => {
    markCandidates(
      window.artsImmersiveLightboxOptions?.elementor?.nativeFallback === true,
      window.artsImmersiveLightboxBoot?.enabled !== false
    )
  }
  delete hub.preload

  const boot = (): void => {
    if (lifetime.signal.aborted || instance) return
    instance = createLightboxWithLifecycle(window.artsImmersiveLightboxOptions, {
      roots: hub.__roots,
      initialized(lightbox) {
        if (hub.__disposeBoot === dispose && !lifetime.signal.aborted) hub.__setInstance(lightbox)
      },
      destroying(lightbox) {
        if (hub.__disposeBoot === dispose && hub.get() === lightbox) hub.__setInstance(null)
      },
      isActive: () => window.artsImmersiveLightboxBoot?.enabled !== false
    })
    instance.init()
    document.dispatchEvent(new CustomEvent('arts-lightbox:ready', { detail: instance }))
    // A ready listener may dispose this boot; never reopen on behalf of a retired owner.
    if (!lifetime.signal.aborted && hub.get() === instance) openFromHash(instance)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true, signal: lifetime.signal })
  } else {
    boot()
  }
})
