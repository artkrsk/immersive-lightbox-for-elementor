import { createLightboxApp } from './core/createLightboxApp'
import type { ILightboxBootScript } from './interfaces/ILightboxBootScript'

const app = createLightboxApp({
  options: window.artsImmersiveLightboxOptions,
  signal: (document.currentScript as ILightboxBootScript | null)?.__artsLightboxSignal
})
app.init()
