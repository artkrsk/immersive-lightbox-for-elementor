import { VERSION } from '../constants/version'
import type { IGateGlobal, ILightbox, ILightboxRoot } from '../interfaces'
import type { IArtsLightboxGlobal } from '../interfaces/IArtsLightboxGlobal'
import type { TLightboxRootsObserver } from '../types'

/** No engine imports: observation at gate time must not warm/load any assets. */
export function getLightboxGlobal(win: Window): IGateGlobal {
  const host = win as Window & { artsLightbox?: IArtsLightboxGlobal }
  if (host.artsLightbox) {
    return host.artsLightbox as IGateGlobal
  }

  let instance: ILightbox | null = null
  let resolveReady: (lightbox: ILightbox) => void
  let revision = 0
  let publishing = 0
  let replacing = false
  let pendingBoot: { install: () => void; signal: AbortSignal | undefined } | undefined
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
    version: VERSION,
    refresh() {},
    __replaceBoot(install, signal) {
      pendingBoot = { install, signal }
      const flush = () => {
        if (replacing || publishing) return
        replacing = true
        try {
          while (pendingBoot) {
            const next = pendingBoot
            pendingBoot = undefined
            if (next.signal?.aborted) {
              continue
            }
            hub.__disposeBoot?.()
            if (!pendingBoot && !next.signal?.aborted) {
              next.install()
            }
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
  host.artsLightbox = hub
  return hub
}
