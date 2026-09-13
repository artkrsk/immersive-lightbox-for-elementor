import type { IGateGlobal, ILightbox, ILightboxRoot } from '../interfaces'
import type { TLightboxRootsObserver } from '../types'

/** No engine imports: observation at gate time must not warm/load any assets. */
export function getLightboxGlobal(win: Window): IGateGlobal {
  if (win.artsLightbox) return win.artsLightbox as IGateGlobal

  let instance: ILightbox | null = null
  let resolveReady: (lightbox: ILightbox) => void
  let revision = 0
  let publishing = 0
  let replacing = false
  let pendingBoot: (() => void) | undefined
  let snapshot: readonly ILightboxRoot[] = Object.freeze([])
  const roots = new Map<HTMLElement, ILightboxRoot>()
  const observers = new Set<TLightboxRootsObserver>()
  const publish = () => {
    snapshot = Object.freeze([...roots.values()])
    const value = snapshot
    const publication = ++revision
    publishing++
    try {
      for (const notify of [...observers]) {
        if (publication !== revision) break
        notify(value)
      }
    } finally {
      publishing--
    }
  }
  const hub: IGateGlobal = {
    ready: new Promise((resolve) => {
      resolveReady = resolve
    }),
    get: () => instance,
    version: __ARTS_IMMERSIVE_LIGHTBOX_VERSION__,
    refresh() {},
    __replaceBoot(install) {
      pendingBoot = install
      const flush = () => {
        if (replacing || publishing) return
        replacing = true
        try {
          while (pendingBoot) {
            const next = pendingBoot
            pendingBoot = undefined
            hub.__disposeBoot?.()
            if (!pendingBoot) next()
          }
        } finally {
          replacing = false
        }
      }
      if (publishing) queueMicrotask(flush)
      else flush()
    },
    observeRoots(listener, { signal } = {}) {
      if (signal?.aborted) return () => {}
      let active = true
      const notify: TLightboxRootsObserver = (value) => {
        if (!active) return
        try {
          listener(value)
        } catch (error) {
          console.error('[arts-lightbox] observer failed', error)
        }
      }
      const stop = () => {
        if (!active) return
        active = false
        observers.delete(notify)
        signal?.removeEventListener('abort', stop)
      }
      observers.add(notify)
      signal?.addEventListener('abort', stop, { once: true })
      notify(snapshot)
      return stop
    },
    __setInstance(value) {
      instance = value
      if (value) resolveReady(value)
    },
    __roots: {
      set(value) {
        const old = roots.get(value.root)
        if (old && old.index === value.index && old.total === value.total) return
        roots.set(
          value.root,
          Object.freeze({ ...value, sourceElement: old?.sourceElement ?? value.sourceElement })
        )
        publish()
      },
      delete(root) {
        if (roots.delete(root)) publish()
      }
    }
  }
  win.artsLightbox = hub
  return hub
}
