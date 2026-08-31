/**
 * WordPress plugin entry (side-effect boot). The library surface stays in
 * index.ts; this file wires the page: discovery global, options intake,
 * init, and the ready announcement. The Elementor editor bridge is its own
 * bundle (editor.ts), loaded only inside the editor's parent window.
 */

import { markCandidates } from './collector/markCandidates'
import { createLightbox } from './core/createLightbox'
import { openFromHash } from './core/openFromHash'
import type { IArtsLightboxGlobal, IGateGlobal, ILightbox } from './interfaces'

let instance: ILightbox | null = null

// When the wp_head gate printed, it installed the global at parse time with a
// pending `ready`; claim its resolver so consumers holding that promise see
// it resolve. Without a gate (direct bundle import, inline script stripped by
// an optimizer) fall back to self-creating — the pre-gate contract.
const gate = window.artsLightbox as IGateGlobal | undefined
let resolveReady: (lightbox: ILightbox) => void
const ready = gate?.__resolveReady
  ? gate.ready
  : new Promise<ILightbox>((resolve) => {
      resolveReady = resolve
    })
if (gate?.__resolveReady) {
  resolveReady = gate.__resolveReady
}

const artsLightbox: IArtsLightboxGlobal = {
  ready,
  get: () => instance,
  version: __ARTS_IMMERSIVE_LIGHTBOX_VERSION__,
  // This object REPLACES the gate's, so the re-scan is re-stated here; the
  // resolved kit switch prints into both payloads for exactly this reason.
  refresh: () => {
    markCandidates(window.artsImmersiveLightboxOptions?.elementor?.nativeFallback === true)
  }
}
window.artsLightbox = artsLightbox

const boot = (): void => {
  instance = createLightbox(window.artsImmersiveLightboxOptions)
  instance.init()
  resolveReady(instance)
  document.dispatchEvent(new CustomEvent('arts-lightbox:ready', { detail: instance }))
  // Elementor-style deep link: a lightbox action hash on arrival opens now.
  openFromHash(instance)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}
