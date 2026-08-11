/**
 * Inline pre-paint gate — printed into `wp_head` by PHP, never enqueued.
 * Owns the parse-time discovery global and the <html> state classes. The
 * engine + CSS load only when someone is about to need them: a click on a
 * candidate is HELD (prevented), assets load, and the open replays through
 * the ready promise; hovering a candidate pre-warms the load. A failed
 * engine load releases the held click to native navigation — the image URL
 * opens as a plain link.
 */

import { GATE_CSS_ID, GATE_JS_ID } from './constants/assetIds'
import { HTML_ACTIVE, HTML_INACTIVE } from './constants/htmlClasses'
import { CANDIDATE_SELECTOR } from './constants/selectors'
import type { IGateGlobal, ILightbox } from './interfaces'

// Idempotence: a second print (double-wp_head themes) or a replayed inline
// script (AJAX-transition eval paths) must not clobber the live global.
if (!window.artsLightbox) {
  let resolveReady: (lightbox: ILightbox) => void
  const ready = new Promise<ILightbox>((resolve) => {
    resolveReady = resolve
  })
  const gate: IGateGlobal = {
    ready,
    get: () => null,
    version: __ARTS_BETTER_LIGHTBOX_VERSION__,
    __resolveReady: (lightbox) => resolveReady(lightbox)
  }
  window.artsLightbox = gate

  const html = document.documentElement
  const boot = window.artsBetterLightboxBoot
  const enabled = boot ? boot.enabled : false
  html.classList.toggle(HTML_ACTIVE, enabled)
  html.classList.toggle(HTML_INACTIVE, !enabled)

  if (enabled && boot) {
    let loading = false
    let heldHref: string | null = null

    // A broken deploy degrades to the native link: the full-size image opens
    // as a plain navigation instead of a dead click.
    const fail = (): void => {
      if (heldHref) {
        window.location.assign(heldHref)
      } else if (import.meta.env?.DEV) {
        console.warn('[arts-lightbox] engine assets failed to load')
      }
    }

    const load = (): void => {
      if (loading || document.getElementById(GATE_JS_ID)) {
        return
      }
      loading = true
      const link = document.createElement('link')
      link.id = GATE_CSS_ID
      link.rel = 'stylesheet'
      link.href = boot.css
      // Serialized on purpose: the engine builds chrome markup on open — a
      // script that won the race would paint it unstyled.
      link.onload = () => {
        // onload can re-fire (moved links; test DOMs) — same guard as load().
        if (document.getElementById(GATE_JS_ID)) {
          return
        }
        const script = document.createElement('script')
        script.id = GATE_JS_ID
        script.src = boot.js
        script.onerror = fail
        document.head.appendChild(script)
      }
      link.onerror = fail
      document.head.appendChild(link)
    }

    const opts = { capture: true }

    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const el = (e.target as Element | null)?.closest<HTMLElement>(CANDIDATE_SELECTOR)
      if (!el) {
        return
      }
      // Hold the click: the engine replays it as an open once ready.
      e.preventDefault()
      e.stopPropagation()
      heldHref = el.getAttribute('href')
      load()
      void ready.then((lightbox) => {
        heldHref = null
        lightbox.open(el)
      })
    }

    const onOver = (e: Event): void => {
      if ((e.target as Element | null)?.closest(CANDIDATE_SELECTOR)) {
        load()
      }
    }

    const disarm = (): void => {
      document.removeEventListener('click', onClick, opts)
      document.removeEventListener('pointerover', onOver, opts)
    }
    // Once the engine is live its own delegated handler owns clicks.
    void ready.then(disarm)

    if (boot.editor) {
      // Editor preview loads immediately — no lazy anything in the editor.
      load()
    } else {
      document.addEventListener('click', onClick, opts)
      document.addEventListener('pointerover', onOver, opts)
    }
  }
}
