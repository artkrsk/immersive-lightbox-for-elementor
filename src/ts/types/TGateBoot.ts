/** Printed by PHP alongside the gate: asset URLs + per-request state. */
export type TGateBoot = {
  css: string
  js: string
  enabled: boolean
  /** Elementor editor preview — load eagerly, never lazily. */
  editor?: boolean
  /**
   * The kit's `global_image_lightbox` switch, resolved by PHP — the gate
   * never reads the full options payload, so the one fact prints twice.
   */
  nativeFallback?: boolean
}
