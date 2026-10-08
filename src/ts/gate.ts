/** WordPress adapter; the reusable gate has no Elementor or WooCommerce hooks. */
import { createLightboxGate } from './gate/createLightboxGate'
import { attachRefreshHooks } from './wordpress/attachRefreshHooks'

if (!window.artsLightbox) {
  const config = window.artsImmersiveLightboxBoot ?? { enabled: false, css: '', js: '' }
  const gate = createLightboxGate(config)
  gate.init()
  if (config.enabled) {
    attachRefreshHooks(gate.signal)
  }
}
