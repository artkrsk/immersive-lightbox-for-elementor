/**
 * Inline pre-paint gate — printed into `wp_head` by `Plugin::print_gate`,
 * never enqueued. Owns the parse-time discovery global and the <html> state
 * classes. The engine + CSS load only when someone is about to need them: a
 * click on a candidate is HELD (prevented), assets load, and the open replays
 * through the ready promise; hovering a candidate pre-warms the load. A
 * failed engine load releases the held click to native navigation — the image
 * URL opens as a plain link.
 */

import { claimCandidateClick } from './collector/claimCandidateClick'
import { isLightboxActionHash } from './collector/isLightboxActionHash'
import { markCandidates } from './collector/markCandidates'
import { matchCandidateElement } from './collector/matchCandidateElement'
import { pointerTravel } from './collector/pointerTravel'
import { GATE_CSS_ID, GATE_JS_ID } from './constants/assetIds'
import { HTML_ACTIVE, HTML_INACTIVE } from './constants/htmlClasses'
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
    version: __ARTS_IMMERSIVE_LIGHTBOX_VERSION__,
    // Boot read lazily: the global is built before the boot payload is, and
    // the same closure serves every later call. Disabled stays a safe no-op.
    refresh: () => {
      const b = window.artsImmersiveLightboxBoot
      if (b?.enabled) {
        markCandidates(b.nativeFallback === true)
      }
    },
    __resolveReady: (lightbox) => resolveReady(lightbox)
  }
  window.artsLightbox = gate

  const html = document.documentElement
  const boot = window.artsImmersiveLightboxBoot
  const enabled = boot ? boot.enabled : false
  html.classList.toggle(HTML_ACTIVE, enabled)
  html.classList.toggle(HTML_INACTIVE, !enabled)

  if (enabled && boot) {
    // The gate prints in wp_head, before the body exists — the candidate
    // scan waits for the DOM it marks. PERSISTENT, not once: Arts AJAX
    // themes re-dispatch DOMContentLoaded after every page transition (the
    // family's documented third-party hook, fired once the swapped
    // container and any header/footer partials are in the document), so the
    // same line re-marks each new page. Through the live global, so the
    // engine-era implementation takes over once boot replaces the object.
    // Inert on a plain site — nothing re-emits the event there.
    document.addEventListener('DOMContentLoaded', () => window.artsLightbox?.refresh())
    if (document.readyState !== 'loading') {
      gate.refresh()
    }

    // Elementor rebuilds the DOM it renders — the editor canvas replaces every
    // widget with AJAX-rendered markup on open and on every change, and on the
    // front end popups, load-more and Loop Grid inject theirs — which carries
    // away marks stamped at DOM-ready. Its own per-element ready hook is the
    // signal: it fires after each render, in both places, and the editor drives
    // the preview iframe's registry, so subscribing from here reaches it.
    // Coalesced to one frame because it fires once PER ELEMENT — a page's worth
    // of renders is one document rescan, not one each.
    let pending = 0
    const remark = (): void => {
      if (pending) {
        return
      }
      pending = requestAnimationFrame(() => {
        pending = 0
        window.artsLightbox?.refresh()
      })
    }
    const subscribe = (): void => {
      window.elementorFrontend?.hooks?.addAction('frontend/element_ready/global', remark)
    }
    // `hooks` is built as the first statement of Elementor's init, so reading
    // it IS the "already initialised" test — a replayed gate (AJAX-transition
    // eval) arrives long after the event it would otherwise wait for.
    if (window.elementorFrontend?.hooks) {
      subscribe()
    } else {
      window.addEventListener('elementor/frontend/init', subscribe)
    }

    let loading = false
    let heldHref: string | null = null
    // The first cold click on a bare image link must hold like any other
    // candidate — the predicate is two cheap checks, worth its gate bytes.
    const nativeFallback = boot.nativeFallback === true

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
      const claim = claimCandidateClick(e, nativeFallback)
      if (!claim) {
        return
      }
      // Hold the click: the engine replays it as an open once ready —
      // including the click point, so even the cold-load first open aims
      // the pan at the cursor.
      heldHref = claim.el.getAttribute('href')
      load()
      void ready.then((lightbox) => {
        heldHref = null
        lightbox.open(claim.el, claim.point)
      })
    }

    const onOver = (e: Event): void => {
      if (matchCandidateElement(e.target as Element | null, nativeFallback)) {
        load()
      }
    }

    const disarm = (): void => {
      document.removeEventListener('click', onClick, opts)
      document.removeEventListener('pointerover', onOver, opts)
    }
    // Once the engine is live its own delegated handler owns clicks.
    void ready.then(disarm)

    if (boot.editor || isLightboxActionHash(window.location.hash)) {
      // Editor preview loads immediately — no lazy anything in the editor.
      // So does a shared deep link: the engine's boot opens it, and waiting
      // for a pointer signal would mean a touch visitor never sees it.
      load()
    } else {
      // The claim tells clicks from drag tails by press travel — the
      // measurement must be live before the first cold click arrives.
      pointerTravel.observe()
      document.addEventListener('click', onClick, opts)
      document.addEventListener('pointerover', onOver, opts)
    }
  }
}
