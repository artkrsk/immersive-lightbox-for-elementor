// Barrel carries only exports with live consumers (knip is a hard gate).
// TCurtainDirection / ICurtainMaskOptions / DEFAULT_POINTS join when the
// transition engine consumes them.
export { CurtainMask } from './CurtainMask'
export { bellBow, curvedEdgePath, straightInset } from './curve'
