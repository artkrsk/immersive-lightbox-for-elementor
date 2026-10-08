export interface ILightboxBootScript extends HTMLScriptElement {
  /** The injecting gate's lifetime, retained even after its node is removed. */
  __artsLightboxSignal?: AbortSignal
}
