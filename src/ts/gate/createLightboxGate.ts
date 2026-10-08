import { claimCandidateClick } from '../collector/claimCandidateClick'
import { isLightboxActionHash } from '../collector/isLightboxActionHash'
import { markCandidates } from '../collector/markCandidates'
import { matchCandidateElement } from '../collector/matchCandidateElement'
import { pointerTravel } from '../collector/pointerTravel'
import { GATE_CSS_ID, GATE_JS_ID } from '../constants/assetIds'
import { HTML_ACTIVE, HTML_INACTIVE } from '../constants/htmlClasses'
import { PRELOAD_TIMEOUT_MS } from '../constants/preload'
import { getLightboxGlobal } from '../core/lightboxGlobal'
import type { ILightbox } from '../interfaces/ILightbox'
import type { ILightboxBootScript } from '../interfaces/ILightboxBootScript'
import type { ILightboxGate } from '../interfaces/ILightboxGate'
import type { TLightboxGateOptions } from '../types/TLightboxGateOptions'

export function createLightboxGate(config: TLightboxGateOptions): ILightboxGate {
  const lifetime = new AbortController()
  let started = false
  let dispose: (() => void) | undefined
  const destroy = (): void => {
    if (lifetime.signal.aborted) {
      return
    }
    lifetime.abort()
    dispose?.()
  }
  return {
    signal: lifetime.signal,
    destroy,
    init() {
      if (started || lifetime.signal.aborted) {
        return
      }
      started = true
      const hub = getLightboxGlobal(window)
      hub.__replaceBoot(() => {
        if (lifetime.signal.aborted) {
          return
        }
        hub.__disposeGate?.()
        hub.__disposeGate = destroy
        const html = document.documentElement
        html.classList.toggle(HTML_ACTIVE, config.enabled)
        html.classList.toggle(HTML_INACTIVE, !config.enabled)
        let loading = false
        let engineRequested = false
        let failed = false
        let preloadScheduled = false
        let idle: number | undefined
        let timeout: ReturnType<typeof setTimeout> | undefined
        let link: HTMLLinkElement | undefined
        let script: ILightboxBootScript | undefined
        let releasePointer: (() => void) | undefined
        let heldHref: string | null = null
        const clicks: NonNullable<ReturnType<typeof claimCandidateClick>>[] = []
        const refresh = (): void => {
          if (
            !lifetime.signal.aborted &&
            config.enabled &&
            markCandidates(config.nativeFallback === true) > 0
          ) {
            hub.preload?.()
          }
        }
        const disarm = (): void => {
          document.removeEventListener('click', onClick, true)
          document.removeEventListener('pointerover', onOver, true)
          releasePointer?.()
          releasePointer = undefined
        }
        const activate = (lightbox: ILightbox): void => {
          if (lifetime.signal.aborted || hub.get() !== lightbox) {
            return
          }
          disarm()
          heldHref = null
          for (const claim of clicks.splice(0)) {
            if (lifetime.signal.aborted || hub.get() !== lightbox) {
              break
            }
            lightbox.open(claim.el, claim.point)
          }
        }
        const onReady = (event: DocumentEventMap['arts-lightbox:ready']): void => {
          activate(event.detail)
        }
        const fail = (): void => {
          if (lifetime.signal.aborted || failed) {
            return
          }
          failed = true
          disarm()
          clicks.length = 0
          const href = heldHref
          heldHref = null
          if (href) {
            window.location.assign(href)
          } else if (import.meta.env?.DEV) {
            console.warn('[arts-lightbox] engine assets failed to load')
          }
        }
        const load = (): void => {
          if (
            lifetime.signal.aborted ||
            loading ||
            hub.get() ||
            document.getElementById(GATE_JS_ID)
          ) {
            return
          }
          loading = true
          link = document.createElement('link')
          link.id = GATE_CSS_ID
          link.rel = 'stylesheet'
          link.href = config.css
          link.onload = () => {
            if (lifetime.signal.aborted || engineRequested) {
              return
            }
            engineRequested = true
            if (link) {
              link.onload = null
            }
            if (config.load) {
              void Promise.resolve()
                .then(() => {
                  if (!lifetime.signal.aborted) {
                    return config.load(lifetime.signal)
                  }
                })
                .catch(fail)
            } else {
              script = document.createElement('script') as ILightboxBootScript
              script.id = GATE_JS_ID
              script.src = config.js
              script.__artsLightboxSignal = lifetime.signal
              script.onerror = fail
              document.head.appendChild(script)
            }
          }
          link.onerror = fail
          document.head.appendChild(link)
        }
        const preload = (): void => {
          if (lifetime.signal.aborted || preloadScheduled) {
            return
          }
          preloadScheduled = true
          if (window.requestIdleCallback) {
            idle = window.requestIdleCallback(load, { timeout: PRELOAD_TIMEOUT_MS })
          } else {
            timeout = setTimeout(load, PRELOAD_TIMEOUT_MS)
          }
        }
        const onClick = (event: MouseEvent): void => {
          const claim = claimCandidateClick(event, config.nativeFallback === true)
          if (!claim) {
            return
          }
          heldHref = claim.el.getAttribute('href')
          clicks.push(claim)
          load()
        }
        const onOver = (event: Event): void => {
          if (
            matchCandidateElement(event.target as Element | null, config.nativeFallback === true)
          ) {
            load()
          }
        }
        const onDomReady = (): void => {
          hub.refresh()
        }
        hub.refresh = refresh
        dispose = () => {
          disarm()
          clicks.length = 0
          heldHref = null
          if (idle !== undefined) {
            window.cancelIdleCallback?.(idle)
          }
          if (timeout !== undefined) {
            clearTimeout(timeout)
          }
          document.removeEventListener('DOMContentLoaded', onDomReady)
          document.removeEventListener('arts-lightbox:ready', onReady)
          if (link) {
            link.onload = link.onerror = null
            link.remove()
          }
          if (script) {
            script.onerror = null
            script.remove()
          }
          if (hub.__disposeGate === destroy) {
            delete hub.__disposeGate
            if (hub.refresh === refresh) {
              hub.refresh = () => {}
            }
            if (hub.preload === preload) {
              delete hub.preload
            }
            html.classList.remove(HTML_ACTIVE, HTML_INACTIVE)
          }
        }
        if (!config.enabled) {
          return
        }
        try {
          CSS.registerProperty({
            name: '--arts-lightbox-ui-visible',
            syntax: '<number>',
            inherits: true,
            initialValue: '1'
          })
        } catch {
          /** Already registered, or unsupported. */
        }
        hub.preload = preload
        document.addEventListener('DOMContentLoaded', onDomReady)
        document.addEventListener('arts-lightbox:ready', onReady)
        if (document.readyState !== 'loading') {
          refresh()
        }
        if (config.editor || isLightboxActionHash(window.location.hash)) {
          load()
        } else {
          releasePointer = pointerTravel.observe()
          document.addEventListener('click', onClick, true)
          document.addEventListener('pointerover', onOver, true)
        }
      }, lifetime.signal)
    }
  }
}
