/** Printed by PHP alongside the gate: asset URLs + per-request state. */
export type TGateBoot = {
  css: string
  js: string
  enabled: boolean
  /** Elementor editor preview — load eagerly, never lazily. */
  editor?: boolean
}
